#!/usr/bin/env python3
"""Align one tape transcript (.txt) with its subtitles (.vtt) and write a
sentences JSON: char offsets, approximate timecodes and metadata keywords.

    python align_tape.py 06052-01.spellfix.txt 06052-01.spellfix.vtt 6052.json

Canonical text = file content decoded as UTF-8 (BOM dropped), NFC-normalized,
with \\n line endings. All offsets refer to that string, and the JSON stores
its SHA-256 so a stale offsets file can be detected. Offsets are written in
UTF-16 code units (what JavaScript string indices use).
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

VERSION = 1

TOK = re.compile(r"\w+", re.UNICODE)
TAG = re.compile(r"<[^>]*>") # strip HTML tags from VTT text
# One sentence inside a single line: ends at . ! ? … (plus closing quotes or
# brackets) followed by whitespace/end of line, or at the end of the line.
SENT = re.compile(r"\S.*?(?:[.!?…]+[\"'”’)\]]*(?=\s|$)|$)")

MIN_BLOCK = 3         # ignore matching runs shorter than this many words
MIN_OVERLAP = 0.3     # a sentence must lie at least 30% within a minute to inherit its keywords
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
    print(idx, known, start, end, matched)
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
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("txt", type=Path)
    ap.add_argument("vtt", type=Path)
    ap.add_argument("metadata", type=Path, help="testimony metadata JSON")
    ap.add_argument("--tape", type=int, help="tape number (default: parsed from NNNNN-TT in the file name)")
    ap.add_argument("--out", type=Path, help="default: <txt without .txt>.sentences.json")
    ap.add_argument("--strict", action="store_true", help="exit with status 2 when there are warnings")
    args = ap.parse_args()

    tape = args.tape
    if tape is None:
        m = re.search(r"-(\d+)\.", args.txt.name)
        if not m:
            sys.exit("error: cannot infer tape number from the file name, pass --tape")
        tape = int(m.group(1))

    text = read_text(args.txt)
    cues = parse_vtt(args.vtt.read_text(encoding="utf-8-sig"))
    metadata = json.loads(args.metadata.read_text(encoding="utf-8-sig"))
    kw_segments, duration = keyword_segments(metadata, tape)

    sentences, report = build(text, cues, kw_segments, tape, duration)

    out = args.out or args.txt.with_suffix(".sentences.json")
    payload = {
        "version": VERSION,
        "tape": tape,
        "offset_unit": "utf-16",
        "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "source": {"txt": args.txt.name, "vtt": args.vtt.name, "metadata": args.metadata.name},
        "report": report,
        "sentences": sentences,
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"{out}: {len(sentences)} sentences", file=sys.stderr)
    print(json.dumps(report, indent=2), file=sys.stderr)
    for w in report["warnings"]:
        print(f"WARNING: {w}", file=sys.stderr)
    if args.strict and report["warnings"]:
        sys.exit(2)


if __name__ == "__main__":
    main()
