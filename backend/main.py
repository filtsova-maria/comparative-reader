import json
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from backend.opensearch_backend import (
    HIGHLIGHT,
    TESTIMONY_INDEX,
    create_client,
    parse_ranges,
    text_query,
    word_offset_at_utf16,
)

METADATA_DIR = Path(__file__).resolve().parents[1] / "data" / "metadata"
DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"

class TestimonySummaryFields(BaseModel):
    id: str
    name: str
    language: str
    interview_date: str | None
    location: str | None
    duration: str | None
    thumbnail_url: str | None


class TestimonySummary(TestimonySummaryFields):
    pass


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


class Snippet(BaseModel):
    idx: int
    tape: int
    text: str
    anchor: int
    ranges: list[Range]


class TestimonySearchResult(TestimonySummaryFields):
    name_match: bool = False
    transcript_hits: int = 0
    snippets: list[Snippet] = Field(default_factory=list)


os_client = create_client()

app = FastAPI(title="Comparative Reader API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _require_search_index() -> None:
    if not os_client.indices.exists(index=TESTIMONY_INDEX):
        raise HTTPException(
            status_code=503,
            detail=(
                "OpenSearch search index is not initialized. "
                "Run `python -m backend.index_opensearch`."
            ),
        )


def _raise_on_msearch_errors(responses: list[dict[str, Any]]) -> None:
    for response in responses:
        if "error" not in response:
            continue
        error = response["error"]
        reason = error.get("reason", str(error)) if isinstance(error, dict) else error
        raise HTTPException(
            status_code=503,
            detail=f"OpenSearch search failed: {reason}",
        )


def load_all_metadata() -> list[dict[str, Any]]:
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
        interview_date=testimony.get("InterviewDate"),
        location=testimony.get("InterviewLocation"),
        duration=testimony.get("Length"),
        thumbnail_url=testimony.get("TestimonyIconImageURL"),
    )

def load_testimony_data(testimony_id: str) -> dict[str, Any]:
    path = DATA_DIR / f"{testimony_id.zfill(5)}.sentences.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Testimony data not found")
    return json.loads(path.read_text(encoding="utf-8"))

def to_testimony_data(data: dict[str, Any]) -> TestimonyData:
    return TestimonyData(
        document_id=data["document_id"],
        tapes=data["report"]["tapes"],
        tape_durations={
            tape["tape"]: tape["report"]["tape_duration_s"]
            for tape in data["tapes"]
        },
        sentences=[Sentence.model_validate(sentence) for sentence in data["sentences"]]
    )


@app.get("/api/testimonies", response_model=list[TestimonySummary])
def list_testimony_summaries(
    search: str | None = Query(default=None),
    language: str | None = Query(default=None),
    location: str | None = Query(default=None),
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
    return sorted(testimonies, key=lambda testimony: testimony.name.casefold())

@app.get("/api/search/testimonies", response_model=list[TestimonySearchResult])
def search_testimonies(
    search: str = Query(min_length=1, max_length=200),
    language: str | None = Query(default=None),
    location: str | None = Query(default=None),
) -> list[TestimonySearchResult]:
    _require_search_index()
    filters: list[dict[str, Any]] = []
    selected_language = language.strip() if language else ""
    if selected_language:
        filters.append({"term": {"language": selected_language}})
    selected_location = location.strip() if location else ""
    if selected_location:
        filters.append(
            {
                "multi_match": {
                    "query": selected_location,
                    "type": "bool_prefix",
                    "fields": ["location_search"],
                    "operator": "and",
                }
            }
        )

    query = search.strip()
    if not query:
        return []
    sentence_hits = {
        "name": "sentences",
        "size": 3,
        "sort": [{"idx": "asc"}],
        "_source": ["idx", "tape", "text", "word_start"],
        "highlight": HIGHLIGHT,
    }
    name_search = {
        "size": 20,
        "query": {
            "bool": {
                "filter": filters,
                "must": [
                    {
                        "bool": {
                            "should": [
                                {
                                    "multi_match": {
                                        "query": query,
                                        "type": "bool_prefix",
                                        "fields": [
                                            "name",
                                            "name._2gram",
                                            "name._3gram",
                                            "metadata_text",
                                        ],
                                        "operator": "and",
                                    }
                                },
                                {
                                    "match": {
                                        "metadata_text": {
                                            "query": query,
                                            "operator": "and",
                                            "fuzziness": "AUTO",
                                        }
                                    }
                                },
                            ],
                            "minimum_should_match": 1,
                        }
                    }
                ],
            }
        },
        "collapse": {"field": "document_id", "inner_hits": sentence_hits},
    }
    transcript_search = {
        "size": 30,
        "query": {
            "bool": {
                "filter": filters,
                "must": [text_query(query)],
            }
        },
        "collapse": {
            "field": "document_id",
            "inner_hits": {
                **sentence_hits,
                "sort": [{"_score": "desc"}, {"idx": "asc"}],
            },
        },
    }
    responses = os_client.msearch(
        body=[
            {"index": TESTIMONY_INDEX},
            name_search,
            {"index": TESTIMONY_INDEX},
            transcript_search,
        ]
    )["responses"]
    _raise_on_msearch_errors(responses)
    name_response, transcript_response = responses

    results: dict[str, TestimonySearchResult] = {}
    for hit in name_response["hits"]["hits"]:
        source = hit["_source"]
        document_id = source["document_id"]
        inner_hits = hit["inner_hits"]["sentences"]["hits"]
        results[document_id] = TestimonySearchResult.model_validate(
            {
                **source,
                "id": document_id,
                "name_match": True,
                "snippets": _to_snippets(inner_hits),
            }
        )

    for hit in transcript_response["hits"]["hits"]:
        source = hit["_source"]
        document_id = source["document_id"]
        testimony = results.get(document_id)
        if testimony is None:
            testimony = TestimonySearchResult.model_validate(
                {**source, "id": document_id}
            )
            results[document_id] = testimony
        inner_hits = hit["inner_hits"]["sentences"]["hits"]
        testimony.transcript_hits = inner_hits["total"]["value"]
        testimony.snippets = _to_snippets(inner_hits)
    return list(results.values())


def _to_snippets(inner_hits: dict[str, Any]) -> list[Snippet]:
    """
    Convert OpenSearch query hits to a list of Snippets with appended data necessary for frontend rendering.
    """
    snippets = []
    for sentence in inner_hits["hits"]:
        source = sentence["_source"]
        ranges = parse_ranges(sentence.get("highlight", {}).get("text", [""])[0])
        first_match = ranges[0][0] if ranges else 0
        snippets.append(
            Snippet(
                idx=source["idx"],
                tape=source["tape"],
                text=source["text"],
                anchor=source["word_start"]
                + word_offset_at_utf16(source["text"], first_match),
                ranges=[Range(start=start, end=end) for start, end in ranges],
            )
        )
    return snippets

@app.get(
    "/api/search/testimonies/{testimony_id}",
    response_model=DocSearchResponse,
)
def search_in_testimony(
    testimony_id: str,
    q: str = Query(min_length=1, max_length=200),
) -> DocSearchResponse:
    if not testimony_id.isdecimal():
        raise HTTPException(status_code=404, detail="Testimony not found")
    _require_search_index()

    response = os_client.search(
        index=TESTIMONY_INDEX,
        body={
            "size": 5000,
            "track_total_hits": True,
            "_source": ["idx", "tape", "text", "word_start"],
            "sort": [{"idx": "asc"}],
            "query": {
                "bool": {
                    "filter": [
                        {"term": {"document_id": f"{int(testimony_id):05d}"}}
                    ],
                    "must": [text_query(q)],
                }
            },
            "highlight": HIGHLIGHT,
        },
    )
    hits: list[DocHit] = []
    for hit in response["hits"]["hits"]:
        source = hit["_source"]
        ranges = parse_ranges(hit.get("highlight", {}).get("text", [""])[0])
        first_match = ranges[0][0] if ranges else 0
        hits.append(
            DocHit(
                idx=source["idx"],
                tape=source["tape"],
                text=source["text"],
                anchor=source["word_start"]
                + word_offset_at_utf16(source["text"], first_match),
                ranges=[
                    Range(start=start, end=end) for start, end in ranges
                ],
            )
        )
    return DocSearchResponse(
        total_sentences=response["hits"]["total"]["value"],
        hits=hits,
    )


# TODO: find a better way to get the list of languages than iterating over all testimonies when working with real data
@app.get("/api/languages", response_model=list[str])
def list_languages() -> list[str]:
    return sorted(
        {to_summary(metadata).language for metadata in load_all_metadata()},
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
    return to_testimony_data(load_testimony_data(testimony_id))
