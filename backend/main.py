import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

METADATA_DIR = Path(__file__).resolve().parents[1] / "data" / "metadata"


class TestimonySummary(BaseModel):
    id: str
    name: str
    language: str
    experience: str | None
    interview_date: str | None
    location: str | None
    duration: str | None
    thumbnail_url: str | None


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


@app.get("/api/testimonies/{testimony_id}")
def get_testimony_metadata(testimony_id: str) -> dict[str, Any]:
    if not testimony_id.isdecimal():
        raise HTTPException(status_code=404, detail="Testimony not found")

    requested_id = testimony_id.zfill(5)
    for metadata in load_metadata():
        if to_summary(metadata).id == requested_id:
            return metadata
    raise HTTPException(status_code=404, detail="Testimony not found")
