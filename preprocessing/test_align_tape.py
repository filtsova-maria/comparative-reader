import json
import tempfile
import unittest
from pathlib import Path

from align_tape import process_transcripts


class ProcessTranscriptsTests(unittest.TestCase):
    def test_combines_sorted_tapes_into_processed_document_schema(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            transcript_dir = root / "transcripts"
            metadata_dir = root / "metadata"
            output_dir = root / "processed"
            transcript_dir.mkdir()
            metadata_dir.mkdir()

            metadata = {
                "Testimony": {
                    "Videos": [
                        {"Tape": 1, "Duration": 10},
                        {"Tape": 2, "Duration": 10},
                    ]
                },
                "Segments": [],
            }
            (metadata_dir / "6052.json").write_text(json.dumps(metadata))

            transcript_paths = []
            for tape in (2, 1):
                transcript_path = (
                    transcript_dir / f"06052-{tape:02d}.spellfix.txt"
                )
                transcript_path.write_text("one two three.\n", encoding="utf-8")
                transcript_path.with_suffix(".vtt").write_text(
                    "WEBVTT\n\n"
                    "00:00:00.000 --> 00:00:03.000\n"
                    "one two three\n",
                    encoding="utf-8",
                )
                transcript_paths.append(transcript_path)

            exit_code = process_transcripts(
                transcript_paths,
                metadata_dir,
                output_dir,
            )
            result = json.loads(
                (output_dir / "06052.sentences.json").read_text(
                    encoding="utf-8"
                )
            )

        self.assertEqual(exit_code, 0)
        self.assertEqual(
            list(result),
            [
                "document_id",
                "offset_unit",
                "metadata",
                "tapes",
                "report",
                "sentences",
            ],
        )
        self.assertEqual(result["document_id"], "06052")
        self.assertEqual([tape["tape"] for tape in result["tapes"]], [1, 2])
        self.assertEqual(
            [sentence["idx"] for sentence in result["sentences"]],
            [0, 1],
        )
        self.assertEqual(
            [sentence["tape"] for sentence in result["sentences"]],
            [1, 2],
        )
        self.assertEqual(
            [sentence["word_start"] for sentence in result["sentences"]],
            [0, 3],
        )
        self.assertEqual(
            result["report"],
            {"tapes": 2, "sentences": 2, "warnings": []},
        )
        self.assertEqual(
            set(result["sentences"][0]),
            {
                "idx",
                "tape",
                "word_start",
                "start_char",
                "end_char",
                "text",
                "start_tc",
                "end_tc",
                "tc_source",
                "matched_ratio",
                "keywords",
            },
        )


if __name__ == "__main__":
    unittest.main()
