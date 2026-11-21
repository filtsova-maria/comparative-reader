from typing import Any

from fastapi import APIRouter, Query

from backend.repository import (
    load_all_metadata,
    load_testimony_data,
    load_testimony_metadata,
    to_summary,
    to_testimony_data,
)
from backend.schemas import TestimonyData, TestimonyMetadata, TestimonySummary

router = APIRouter()


def _filtered_testimony_summaries(
    search: str | None,
    language: str | None,
    location: str | None,
    excluded_ids: list[str],
) -> list[TestimonySummary]:
    testimonies = [to_summary(metadata) for metadata in load_all_metadata()]
    if search and (query := search.strip()):
        query = query.casefold()
        testimonies = [
            testimony
            for testimony in testimonies
            if query in testimony.name.casefold()
        ]
    selected_language = language.strip() if language else ""
    if selected_language:
        selected_language = selected_language.casefold()
        testimonies = [
            testimony
            for testimony in testimonies
            if testimony.language.casefold() == selected_language
        ]
    selected_location = location.strip().casefold() if location else ""
    if selected_location:
        testimonies = [
            testimony
            for testimony in testimonies
            if selected_location in (testimony.location or "").casefold()
        ]
    excluded_id_set = set(excluded_ids)
    if excluded_id_set:
        testimonies = [
            testimony
            for testimony in testimonies
            if testimony.id not in excluded_id_set
        ]
    testimonies.sort(key=lambda testimony: testimony.name.casefold())
    return testimonies


@router.get("/api/testimonies", response_model=list[TestimonySummary])
def list_testimony_summaries(
    search: str | None = Query(default=None),
    language: str | None = Query(default=None),
    location: str | None = Query(default=None),
    excluded_ids: list[str] = Query(default=[]),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[TestimonySummary]:
    testimonies = _filtered_testimony_summaries(
        search, language, location, excluded_ids
    )
    return testimonies[offset : offset + limit]


@router.get("/api/testimonies/count", response_model=int)
def count_testimony_summaries(
    search: str | None = Query(default=None),
    language: str | None = Query(default=None),
    location: str | None = Query(default=None),
    excluded_ids: list[str] = Query(default=[]),
) -> int:
    return len(
        _filtered_testimony_summaries(search, language, location, excluded_ids)
    )


@router.get("/api/languages", response_model=list[str])
def list_languages() -> list[str]:
    return sorted(
        {to_summary(metadata).language for metadata in load_all_metadata()},
        key=str.casefold,
    )


@router.get(
    "/api/testimonies/{testimony_id}",
    response_model=TestimonyMetadata,
)
def get_testimony_metadata(testimony_id: str) -> TestimonyMetadata:
    return TestimonyMetadata.model_validate(load_testimony_metadata(testimony_id))


@router.get("/api/testimonies/{testimony_id}/data", response_model=TestimonyData)
def get_testimony_data(testimony_id: str) -> dict[str, Any]:
    return to_testimony_data(load_testimony_data(testimony_id))
