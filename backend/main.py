import json
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

METADATA_DIR = Path(__file__).resolve().parents[1] / "data" / "metadata"
DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"

class TestimonySummary(BaseModel):
    id: str
    name: str
    language: str
    experience: str | None
    interview_date: str | None
    location: str | None
    duration: str | None
    thumbnail_url: str | None


class TestimonyBio(BaseModel):
    model_config = ConfigDict(extra="allow")

    FullName: str


class TestimonyMetadata(BaseModel):
    model_config = ConfigDict(extra="allow")

    Bio: TestimonyBio


class Keyword(BaseModel):
    id: int
    label: str
    weight: float


class Sentence(BaseModel):
    idx: int
    tape: int
    start_char: int
    end_char: int
    text: str
    start_tc: float
    end_tc: float
    tc_source: Literal["matched", "interpolated", "no_tokens"]
    matched_ratio: float
    keywords: list[Keyword]


class TapeSource(BaseModel):
    txt: str
    vtt: str


class TapeReport(BaseModel):
    token_match_ratio: float
    longest_unmatched_run_words: int
    sentences: int
    sentences_first_word_interpolated: int
    sentences_without_words: int
    sentences_with_keywords: int
    max_jump_s: float
    last_end_tc: float | None
    tape_duration_s: float
    warnings: list[str]


class ProcessedTape(BaseModel):
    tape: int
    text_sha256: str
    source: TapeSource
    report: TapeReport


class DocumentReport(BaseModel):
    tapes: int
    sentences: int
    warnings: list[str]


class TestimonyData(BaseModel):
    document_id: str
    tapes: int
    sentences: list[Sentence]

app = FastAPI(title="Comparative Reader Mock API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def load_metadata() -> list[dict[str, Any]]:
    records = []
    for path in sorted(METADATA_DIR.glob("*.json")):
        records.append(json.loads(path.read_text(encoding="utf-8")))
    return records


def load_testimony_metadata(testimony_id: str) -> dict[str, Any]:
    path = METADATA_DIR / f"{int(testimony_id)}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Testimony not found")
    return json.loads(path.read_text(encoding="utf-8"))


def to_summary(metadata: dict[str, Any]) -> TestimonySummary:
    testimony = metadata["Testimony"]
    bio = metadata["Bio"]
    return TestimonySummary(
        id=f"{int(testimony['IntCode']):05d}",
        name=bio["FullName"],
        language=testimony["LanguageLabel"],
        experience=testimony.get("ExperienceGroups"),
        interview_date=testimony.get("InterviewDate"),
        location=testimony.get("InterviewLocation"),
        duration=testimony.get("Length"),
        thumbnail_url=testimony.get("TestimonyIconImageURL"),
    )

def load_data(testimony_id: str) -> dict[str, Any]:
    path = DATA_DIR / f"{testimony_id.zfill(5)}.sentences.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Testimony data not found")
    return json.loads(path.read_text(encoding="utf-8"))

def to_testimony_contents(data: dict[str, Any]) -> TestimonyData:
    return TestimonyData(
        document_id=data["document_id"],
        tapes=data["report"]["tapes"],
        sentences=[Sentence.model_validate(sentence) for sentence in data["sentences"]]
    )


@app.get("/api/testimonies", response_model=list[TestimonySummary])
def list_testimonies(
    search: str | None = Query(default=None),
    language: str | None = Query(default=None),
) -> list[TestimonySummary]:
    testimonies = [to_summary(metadata) for metadata in load_metadata()]
    if search and (query := search.strip()):
        query = query.casefold()
        testimonies = [
            testimony
            for testimony in testimonies
            if query in testimony.name.casefold()
        ]
    if language and (selected_language := language.strip()):
        selected_language = selected_language.casefold()
        testimonies = [
            testimony
            for testimony in testimonies
            if testimony.language.casefold() == selected_language
        ]
    return sorted(testimonies, key=lambda testimony: testimony.name.casefold())


# TODO: find a better way to get the list of languages than iterating over all testimonies when working with real data
@app.get("/api/languages", response_model=list[str])
def list_languages() -> list[str]:
    return sorted(
        {to_summary(metadata).language for metadata in load_metadata()},
        key=str.casefold,
    )


@app.get(
    "/api/testimonies/{testimony_id}",
    response_model=TestimonyMetadata,
)
def get_testimony_metadata(testimony_id: str) -> TestimonyMetadata:
    if not testimony_id.isdecimal():
        raise HTTPException(status_code=404, detail="Testimony not found")

    return TestimonyMetadata.model_validate(load_testimony_metadata(testimony_id))


@app.get("/api/testimonies/{testimony_id}/data", response_model=TestimonyData)
def get_testimony_data(testimony_id: str) -> TestimonyData:
    if not testimony_id.isdecimal():
        raise HTTPException(status_code=404, detail="Testimony data not found")
    return to_testimony_contents(load_data(testimony_id))
