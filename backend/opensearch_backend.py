import os
from collections.abc import Mapping
from typing import Any
from urllib.parse import urlparse

from opensearchpy import OpenSearch, helpers

TESTIMONIES_INDEX = "testimonies"
SENTENCES_INDEX = "sentences"
PRE_TAG = "\ue000"
POST_TAG = "\ue001"

HIGHLIGHT = {
    "pre_tags": [PRE_TAG],
    "post_tags": [POST_TAG],
    "require_field_match": False,
    "fields": {"text": {"number_of_fragments": 0}},
}

INDEX_DEFINITIONS: dict[str, dict[str, Any]] = {
    TESTIMONIES_INDEX: {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "analysis": {
                "analyzer": {
                    "folding": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "asciifolding"],
                    }
                },
                "normalizer": {
                    "lc": {
                        "type": "custom",
                        "filter": ["lowercase", "asciifolding"],
                    }
                },
            },
        },
        "mappings": {
            "properties": {
                "id": {"type": "keyword"},
                "name": {
                    "type": "search_as_you_type",
                    "analyzer": "folding",
                    "fields": {
                        "keyword": {"type": "keyword", "normalizer": "lc"}
                    },
                },
                "language": {"type": "keyword", "normalizer": "lc"},
                "experience": {"type": "keyword"},
                "interview_date": {"type": "keyword", "index": False},
                "location": {"type": "keyword"},
                "duration": {"type": "keyword", "index": False},
                "thumbnail_url": {"type": "keyword", "index": False},
            }
        },
    },
    SENTENCES_INDEX: {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "analysis": {
                "normalizer": {
                    "lc": {
                        "type": "custom",
                        "filter": ["lowercase", "asciifolding"],
                    }
                }
            },
        },
        "mappings": {
            "properties": {
                "document_id": {"type": "keyword"},
                "language": {"type": "keyword", "normalizer": "lc"},
                "experience": {"type": "keyword"},
                "idx": {"type": "integer"},
                "tape": {"type": "integer"},
                "start_tc": {"type": "float"},
                "end_tc": {"type": "float"},
                "text": {
                    "type": "text",
                    "analyzer": "standard",
                    "fields": {"exact": {"type": "text", "analyzer": "standard"}},
                },
                "keyword_labels": {"type": "keyword"},
            }
        },
    },
}


def create_client() -> OpenSearch:
    url = urlparse(os.getenv("OPENSEARCH_URL", "http://localhost:9200"))
    if url.scheme not in {"http", "https"} or not url.hostname:
        raise ValueError("OPENSEARCH_URL must be an HTTP(S) URL with a hostname")
    return OpenSearch(
        hosts=[
            {
                "host": url.hostname,
                "port": url.port or (443 if url.scheme == "https" else 9200),
            }
        ],
        use_ssl=url.scheme == "https",
    )


def ensure_indices(client: OpenSearch) -> None:
    for index_name, definition in INDEX_DEFINITIONS.items():
        if not client.indices.exists(index=index_name):
            client.indices.create(index=index_name, body=definition)


def index_testimony(
    client: OpenSearch,
    summary: Mapping[str, Any],
    sentences_doc: Mapping[str, Any] | None,
) -> None:
    document_id = str(summary["id"])
    if sentences_doc is not None and str(sentences_doc["document_id"]) != document_id:
        raise ValueError(
            "Testimony summary id must match the sentences document_id"
        )

    client.index(
        index=TESTIMONIES_INDEX,
        id=document_id,
        body=dict(summary),
        params={"refresh": "false"},
    )
    client.delete_by_query(
        index=SENTENCES_INDEX,
        body={"query": {"term": {"document_id": document_id}}},
        params={"conflicts": "proceed", "refresh": "false"},
    )

    if sentences_doc is not None:
        actions = (
            {
                "_index": SENTENCES_INDEX,
                "_id": f"{document_id}-{sentence['idx']}",
                "_source": {
                    "document_id": document_id,
                    "language": summary["language"],
                    "experience": summary.get("experience"),
                    "idx": sentence["idx"],
                    "tape": sentence["tape"],
                    "start_tc": sentence["start_tc"],
                    "end_tc": sentence["end_tc"],
                    "text": sentence["text"],
                    "keyword_labels": sorted(
                        {keyword["label"] for keyword in sentence["keywords"]}
                    ),
                },
            }
            for sentence in sentences_doc["sentences"]
        )
        helpers.bulk(client, actions)

    client.indices.refresh(index=SENTENCES_INDEX)


def text_query(query: str) -> dict[str, Any]:
    return {
        "simple_query_string": {
            "query": query,
            "fields": ["text", "text.exact^2"],
            "default_operator": "and",
        }
    }


def parse_ranges(tagged: str) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    position = 0
    start = 0
    for character in tagged:
        if character == PRE_TAG:
            start = position
        elif character == POST_TAG:
            ranges.append((start, position))
        else:
            position += 2 if ord(character) > 0xFFFF else 1
    return ranges
