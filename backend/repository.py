import json
from collections.abc import Iterator
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from backend.anchors import add_word_starts
from backend.ids import normalize_id
from backend.schemas import TestimonySummary

METADATA_DIR = Path(__file__).resolve().parents[1] / "data" / "metadata"
DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"


@lru_cache(maxsize=1)
def load_all_metadata() -> list[dict[str, Any]]:
    return list(iter_all_metadata())


def iter_all_metadata() -> Iterator[dict[str, Any]]:
    for path in sorted(METADATA_DIR.glob("*.json")):
        yield json.loads(path.read_text(encoding="utf-8"))


def load_testimony_metadata(testimony_id: str) -> dict[str, Any]:
    try:
        normalized_id = normalize_id(testimony_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail="Testimony not found") from error
    path = METADATA_DIR / f"{int(normalized_id)}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Testimony not found")
    return json.loads(path.read_text(encoding="utf-8"))


def load_testimony_data(testimony_id: str) -> dict[str, Any]:
    try:
        normalized_id = normalize_id(testimony_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail="Testimony data not found") from error
    path = DATA_DIR / f"{normalized_id}.sentences.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Testimony data not found")
    return json.loads(path.read_text(encoding="utf-8"))


def to_summary(metadata: dict[str, Any]) -> TestimonySummary:
    testimony = metadata["Testimony"]
    bio = metadata["Bio"]
    return TestimonySummary(
        id=normalize_id(testimony["IntCode"]),
        name=bio["FullName"],
        language=testimony["LanguageLabel"],
        interview_date=testimony.get("InterviewDate"),
        location=testimony.get("InterviewLocation"),
        duration=testimony.get("Length"),
        thumbnail_url=testimony.get("TestimonyIconImageURL"),
    )


def to_testimony_data(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "document_id": normalize_id(data["document_id"]),
        "tapes": data["report"]["tapes"],
        "tape_durations": {
            tape["tape"]: tape["report"]["tape_duration_s"]
            for tape in data["tapes"]
        },
        "sentences": add_word_starts(data["sentences"]),
    }
