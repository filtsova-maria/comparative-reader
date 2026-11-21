#!/usr/bin/env python3
"""Align transcript tapes and write one combined sentences JSON per testimony.

Run from the repository root, passing all transcript TXT files:

    python preprocessing/align_tape.py data/transcripts/*.txt

Each TXT is paired with a VTT of the same name and grouped by its
``<document-id>-<tape-number>`` filename prefix. The corresponding metadata
JSON is loaded from ``data/metadata/<integer-document-id>.json``. By default,
the combined result is written to
``data/processed/<five-digit-document-id>.sentences.json``. Override the
metadata and output directories with ``--metadata-dir`` and ``--out-dir``.

Transcript text is decoded as UTF-8 (dropping a BOM), normalized to NFC, and
given LF line endings before alignment. Sentence offsets are exclusive-end
UTF-16 code-unit offsets into this canonical text, matching JavaScript string
indices. Each tape entry includes a SHA-256 digest so consumers can detect
when stored offsets no longer correspond to the transcript.

Matching runs of at least three normalized words inherit VTT cue times;
unmatched words are interpolated between matched words. The combined document
JSON contains per-tape source files, hashes and reports, plus sentences with
indices continuous across tapes. Use ``--strict`` to exit with status 2 when
any report contains warnings; outputs are still written.
"""
import argparse
import hashlib
import html
import json
import re
import sys
import unicodedata
from bisect import bisect_left
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np

REPO_DIR = Path(__file__).resolve().parents[1]
if str(REPO_DIR) not in sys.path:
    sys.path.insert(0, str(REPO_DIR))

from backend.anchors import word_count
from backend.ids import normalize_id

TOK = re.compile(r"\w+", re.UNICODE)
TAG = re.compile(r"<[^>]*>") # strip HTML tags from VTT text
# One sentence inside a single line: ends at . ! ? … (plus closing quotes or
# brackets) followed by whitespace/end of line, or at the end of the line.
SENT = re.compile(r"\S.*?(?:[.!?…]+[\"'”’)\]]*(?=\s|$)|$)")

MIN_BLOCK = 3         # ignore matching runs shorter than this many words
MIN_OVERLAP = 0.3     # a sentence must overlap a keyword segment by at least 30%
WARN_MATCH_RATIO = 0.90 # minimum fraction of transcript words that must match a VTT word
WARN_MAX_JUMP_S = 120.0 # maximum gap between consecutive sentences (seconds)

# --------------------------------------------------------------------------
# Reading and normalization
# --------------------------------------------------------------------------
def norm(s: str) -> str:
    """Comparison form of a word: no diacritics, case-folded."""
    s = unicodedata.normalize("NFKD", s).casefold()
    return "".join(c for c in s if not unicodedata.combining(c))


def read_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8-sig")
    raw = raw.replace("\r\n", "\n").replace("\r", "\n")
    return unicodedata.normalize("NFC", raw)


def ts(s: str) -> float:
    """hh:mm:ss.mmm or mm:ss.mmm -> seconds."""
    parts = s.replace(",", ".").split(":")
    seconds = 0.0
    for p in parts:
        seconds = seconds * 60 + float(p)
    return seconds


def parse_vtt(v: str):
    """Return [(start_s, end_s, text)], skipping header/NOTE/STYLE blocks."""
    v = unicodedata.normalize("NFC", v.replace("\r\n", "\n").replace("\r", "\n"))
    cues = []
    for block in re.split(r"\n\s*\n", v.strip().lstrip("﻿")):
        lines = block.strip().splitlines()
        if not lines or lines[0].startswith(("WEBVTT", "NOTE", "STYLE", "REGION")):
            continue
        for i, line in enumerate(lines):
            if "-->" in line:
                a, b = (p.strip().split()[0] for p in line.split("-->"))
                text = html.unescape(TAG.sub("", " ".join(lines[i + 1:])))
                cues.append((ts(a), ts(b), text))
                break
    cues.sort(key=lambda c: c[0])
    return cues


# --------------------------------------------------------------------------
# Metadata
# --------------------------------------------------------------------------
def keyword_segments(metadata, tape):
    """Return ([(start_s, end_s, [{id, label}])], tape_duration_s or None).

    Only segments that carry keywords are returned. A segment ends where the
    next one on the same tape starts, or at the tape duration for the last one.
    """
    videos = (metadata.get("Testimony") or {}).get("Videos") or []
    duration = next((v.get("Duration") for v in videos if v.get("Tape") == tape), None)
    segs = sorted(
        (s for s in metadata.get("Segments", []) if s.get("TapeNumber") == tape),
        key=lambda s: s["TimeCodeValue"],
    )
    out = []
    for k, seg in enumerate(segs):
        start = float(seg["TimeCodeValue"])
        if k + 1 < len(segs):
            end = float(segs[k + 1]["TimeCodeValue"])
        elif duration is not None:
            end = float(duration)
        else:
            end = start + 60.0
        if end <= start:
            end = start + 60.0
        kws = [
            {"id": kw["KeywordID"], "label": kw.get("KeywordLabel")}
            for kw in ((seg.get("Indexes") or {}).get("Keywords") or [])
            if kw.get("KeywordID") is not None
        ]
        if kws:
            out.append((start, end, kws))
    return out, (float(duration) if duration is not None else None)


def keywords_for(tc, end_tc, kw_segments):
    """Keywords of every tagged minute that holds >= MIN_OVERLAP of the sentence.

    weight = share of the sentence that lies inside tagged minutes with that keyword.
    """
    dur = end_tc - tc
    weights, info = {}, {}
    for s, e, kws in kw_segments:
        if dur > 0:
            frac = max(0.0, min(end_tc, e) - max(tc, s)) / dur
        else:
            frac = 1.0 if s <= tc < e else 0.0
        if frac < MIN_OVERLAP:
            continue
        for kw in kws:
            weights[kw["id"]] = weights.get(kw["id"], 0.0) + frac
            info.setdefault(kw["id"], kw)
    return [
        {"id": i, "label": info[i]["label"], "weight": round(min(w, 1.0), 2)}
        for i, w in weights.items()
    ]


# --------------------------------------------------------------------------
# Alignment
# --------------------------------------------------------------------------
def align_tokens(text, cues):
    """Give every transcript word a start/end time from the VTT.

    Words inside a matching run of >= MIN_BLOCK words take their cue time
    (interpolated by position inside the cue). Other words are interpolated
    between the nearest matched words.
    """
    t_tok = [(norm(m.group()), m.start()) for m in TOK.finditer(text)]
    c_tok = []
    for s, e, ctext in cues:
        words = [norm(m.group()) for m in TOK.finditer(ctext)]
        n = len(words)
        for j, w in enumerate(words):
            c_tok.append((w, s + (j / n) * (e - s), s + ((j + 1) / n) * (e - s)))

    a = [w for w, _ in t_tok]
    b = [w for w, _, _ in c_tok]
    n = len(a)
    start = np.full(n, np.nan)
    end = np.full(n, np.nan)
    matched = np.zeros(n, dtype=bool)
    for ti, ci, size in SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        if size < MIN_BLOCK:
            continue
        for k in range(size):
            start[ti + k] = c_tok[ci + k][1]
            end[ti + k] = c_tok[ci + k][2]
            matched[ti + k] = True
    if not matched.any():
        sys.exit("error: no words matched between the transcript and the VTT")

    idx = np.arange(n)
    known = np.flatnonzero(matched)
    start = np.maximum.accumulate(np.interp(idx, known, start[known]))
    end = np.maximum.accumulate(np.interp(idx, known, end[known]))
    return t_tok, start, np.maximum(end, start), matched


def sentence_spans(text):
    """Yield (start, end) char spans. One line holds one or more sentences."""
    for line in re.finditer(r"[^\n]+", text):
        for m in SENT.finditer(line.group()):
            yield line.start() + m.start(), line.start() + m.end()


def utf16_map(text):
    """Code point index -> UTF-16 index, or None when they are identical."""
    if all(ord(c) <= 0xFFFF for c in text):
        return None
    m = [0]
    for c in text:
        m.append(m[-1] + (2 if ord(c) > 0xFFFF else 1))
    return m


def longest_false_run(flags):
    best = cur = 0
    for x in flags:
        cur = 0 if x else cur + 1
        best = max(best, cur)
    return best


def build(text, cues, kw_segments, tape, duration):
    t_tok, start, end, matched = align_tokens(text, cues)
    starts = [p for _, p in t_tok]
    n = len(starts)
    u16 = utf16_map(text)
    off = (lambda i: u16[i]) if u16 else (lambda i: i)

    sentences = []
    for a, b in sentence_spans(text):
        i = bisect_left(starts, a)
        j = bisect_left(starts, b) - 1
        if i > j:  # no words, e.g. a lone "..."
            k = min(i, n - 1)
            tc = etc = float(start[k])
            source, ratio = "no_tokens", 0.0
        else:
            tc, etc = float(start[i]), float(end[j])
            source = "matched" if matched[i] else "interpolated"
            ratio = float(matched[i:j + 1].mean())
        sentences.append({
            "idx": len(sentences),
            "tape": tape,
            "start_char": off(a),
            "end_char": off(b),
            "text": text[a:b],
            "start_tc": round(tc, 2),
            "end_tc": round(etc, 2),
            "tc_source": source,
            "matched_ratio": round(ratio, 2),
            "keywords": keywords_for(tc, etc, kw_segments),
        })

    tcs = [s["start_tc"] for s in sentences]
    report = {
        "token_match_ratio": round(float(matched.mean()), 4),
        "longest_unmatched_run_words": longest_false_run(matched),
        "sentences": len(sentences),
        "sentences_first_word_interpolated": sum(s["tc_source"] == "interpolated" for s in sentences),
        "sentences_without_words": sum(s["tc_source"] == "no_tokens" for s in sentences),
        "sentences_with_keywords": sum(bool(s["keywords"]) for s in sentences),
        "max_jump_s": round(max((y - x for x, y in zip(tcs, tcs[1:])), default=0.0), 2),
        "last_end_tc": sentences[-1]["end_tc"] if sentences else None,
        "tape_duration_s": duration,
    }
    warnings = []
    if report["token_match_ratio"] < WARN_MATCH_RATIO:
        warnings.append(f"token match ratio {report['token_match_ratio']:.2f} < {WARN_MATCH_RATIO}")
    if report["max_jump_s"] > WARN_MAX_JUMP_S:
        warnings.append(f"gap of {report['max_jump_s']} s between consecutive sentences")
    report["warnings"] = warnings
    return sentences, report


# --------------------------------------------------------------------------
def process_transcripts(txt_paths, metadata_dir, output_dir, strict=False):
    grouped = {}
    for txt_path in sorted(txt_paths):
        match = re.match(r"^(?P<document_id>\d+)-(?P<tape>\d+)\.", txt_path.name)
        if not match:
            raise ValueError(
                f"cannot infer document and tape numbers from {txt_path.name}"
            )
        document_id = normalize_id(match.group("document_id"))
        tape = int(match.group("tape"))
        tapes = grouped.setdefault(document_id, {})
        if tape in tapes:
            raise ValueError(
                f"duplicate transcript for document {document_id}, tape {tape}"
            )
        tapes[tape] = txt_path

    output_dir.mkdir(parents=True, exist_ok=True)
    strict_warnings = False
    for document_id, tape_paths in sorted(grouped.items()):
        metadata_path = metadata_dir / f"{int(document_id)}.json"
        if not metadata_path.is_file():
            raise FileNotFoundError(
                f"metadata not found for document {document_id}: {metadata_path}"
            )
        metadata = json.loads(metadata_path.read_text(encoding="utf-8-sig"))
        tape_records = []
        document_sentences = []
        document_warnings = []
        document_word_start = 0

        for tape, txt_path in sorted(tape_paths.items()):
            vtt_path = txt_path.with_suffix(".vtt")
            if not vtt_path.is_file():
                raise FileNotFoundError(f"VTT subtitles not found: {vtt_path}")

            text = read_text(txt_path)
            cues = parse_vtt(vtt_path.read_text(encoding="utf-8-sig"))
            kw_segments, duration = keyword_segments(metadata, tape)
            sentences, report = build(text, cues, kw_segments, tape, duration)

            sentence_offset = len(document_sentences)
            for sentence in sentences:
                sentence["idx"] += sentence_offset
                sentence["word_start"] = document_word_start
                document_word_start += word_count(sentence["text"])
            document_sentences.extend(sentences)

            tape_warnings = report["warnings"]
            strict_warnings = strict_warnings or bool(tape_warnings)
            document_warnings.extend(
                f"Tape {tape}: {warning}" for warning in tape_warnings
            )
            tape_records.append(
                {
                    "tape": tape,
                    "text_sha256": hashlib.sha256(
                        text.encode("utf-8")
                    ).hexdigest(),
                    "source": {"txt": txt_path.name, "vtt": vtt_path.name},
                    "report": report,
                }
            )

        payload = {
            "document_id": document_id,
            "offset_unit": "utf-16",
            "metadata": metadata_path.name,
            "tapes": tape_records,
            "report": {
                "tapes": len(tape_records),
                "sentences": len(document_sentences),
                "warnings": document_warnings,
            },
            "sentences": document_sentences,
        }
        out_path = output_dir / f"{document_id}.sentences.json"
        out_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(
            f"{out_path}: {len(document_sentences)} sentences "
            f"across {len(tape_records)} tapes",
            file=sys.stderr,
        )
        for warning in document_warnings:
            print(f"WARNING: {warning}", file=sys.stderr)

    return 2 if strict and strict_warnings else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("txt", type=Path, nargs="+", help="transcript TXT files (for example: data/transcripts/*.txt)")
    ap.add_argument("--metadata-dir", type=Path, default=Path("data/metadata"))
    ap.add_argument("--out-dir", type=Path, default=Path("data/processed"))
    ap.add_argument("--strict", action="store_true", help="exit with status 2 when there are warnings")
    args = ap.parse_args()

    try:
        exit_code = process_transcripts(
            args.txt,
            args.metadata_dir,
            args.out_dir,
            strict=args.strict,
        )
    except (FileNotFoundError, ValueError) as error:
        ap.error(str(error))
    if exit_code:
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
