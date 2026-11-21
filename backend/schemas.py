from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TestimonySummary(BaseModel):
    id: str
    name: str
    language: str
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
    word_start: int
    start_char: int
    end_char: int
    text: str
    start_tc: float
    end_tc: float
    tc_source: Literal["matched", "interpolated", "no_tokens"]
    matched_ratio: float
    keywords: list[Keyword]


class TestimonyData(BaseModel):
    document_id: str
    tapes: int
    tape_durations: dict[int, float]
    sentences: list[Sentence]


class Range(BaseModel):
    start: int
    end: int


class DocHit(BaseModel):
    idx: int
    tape: int
    text: str
    anchor: int
    ranges: list[Range]


class DocSearchResponse(BaseModel):
    total_sentences: int
    hits: list[DocHit]
    truncated: bool


class TestimonySearchResult(TestimonySummary):
    name_match: bool = False
    transcript_hits: int = 0
    snippets: list[DocHit] = Field(default_factory=list)
