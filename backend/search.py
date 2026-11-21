from typing import Any

from fastapi import HTTPException
from opensearchpy import OpenSearch

from backend.anchors import word_offset_at_utf16
from backend.opensearch_backend import HIGHLIGHT, TESTIMONY_INDEX, parse_ranges, text_query
from backend.schemas import DocHit, Range

DOCUMENT_SEARCH_LIMIT = 5000


def require_search_index(client: OpenSearch) -> None:
    if not client.indices.exists(index=TESTIMONY_INDEX):
        raise HTTPException(
            status_code=503,
            detail=(
                "OpenSearch search index is not initialized. "
                "Run `python -m backend.index_opensearch`."
            ),
        )


def raise_on_msearch_errors(responses: list[dict[str, Any]]) -> None:
    for response in responses:
        if "error" not in response:
            continue
        error = response["error"]
        reason = error.get("reason", str(error)) if isinstance(error, dict) else error
        raise HTTPException(
            status_code=503,
            detail=f"OpenSearch search failed: {reason}",
        )


def build_testimony_search_queries(
    query: str,
    filters: list[dict[str, Any]],
) -> tuple[dict[str, Any], dict[str, Any]]:
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
    return name_search, transcript_search


def build_document_search_query(
    document_id: str,
    query: str,
) -> dict[str, Any]:
    return {
        "size": DOCUMENT_SEARCH_LIMIT,
        "track_total_hits": True,
        "_source": ["idx", "tape", "text", "word_start"],
        "sort": [{"idx": "asc"}],
        "query": {
            "bool": {
                "filter": [{"term": {"document_id": document_id}}],
                "must": [text_query(query)],
            }
        },
        "highlight": HIGHLIGHT,
    }


def to_doc_hits(inner_hits: dict[str, Any]) -> list[DocHit]:
    hits = []
    for sentence in inner_hits["hits"]:
        source = sentence["_source"]
        ranges = parse_ranges(sentence.get("highlight", {}).get("text", [""])[0])
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
    return hits
