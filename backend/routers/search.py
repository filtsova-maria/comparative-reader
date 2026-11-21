from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from opensearchpy import OpenSearch

from backend.dependencies import get_client
from backend.ids import normalize_id
from backend.opensearch_backend import TESTIMONY_INDEX
from backend.schemas import DocSearchResponse, TestimonySearchResult
from backend.search import (
    build_document_search_query,
    build_testimony_search_queries,
    raise_on_msearch_errors,
    require_search_index,
    to_doc_hits,
)

router = APIRouter()


@router.get(
    "/api/search/testimonies",
    response_model=list[TestimonySearchResult],
)
def search_testimonies(
    search: str = Query(min_length=1, max_length=200),
    language: str | None = Query(default=None),
    location: str | None = Query(default=None),
    client: OpenSearch = Depends(get_client),
) -> list[TestimonySearchResult]:
    require_search_index(client)
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
    name_search, transcript_search = build_testimony_search_queries(query, filters)
    responses = client.msearch(
        body=[
            {"index": TESTIMONY_INDEX},
            name_search,
            {"index": TESTIMONY_INDEX},
            transcript_search,
        ]
    )["responses"]
    raise_on_msearch_errors(responses)
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
                "snippets": to_doc_hits(inner_hits),
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
        testimony.snippets = to_doc_hits(inner_hits)
    return list(results.values())


@router.get(
    "/api/search/testimonies/{testimony_id}",
    response_model=DocSearchResponse,
)
def search_in_testimony(
    testimony_id: str,
    q: str = Query(min_length=1, max_length=200),
    client: OpenSearch = Depends(get_client),
) -> DocSearchResponse:
    try:
        normalized_id = normalize_id(testimony_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail="Testimony not found") from error
    require_search_index(client)

    response = client.search(
        index=TESTIMONY_INDEX,
        body=build_document_search_query(normalized_id, q),
    )
    inner_hits = response["hits"]
    hits = to_doc_hits(inner_hits)
    total_sentences = inner_hits["total"]["value"]
    return DocSearchResponse(
        total_sentences=total_sentences,
        hits=hits,
        truncated=total_sentences > len(hits),
    )
