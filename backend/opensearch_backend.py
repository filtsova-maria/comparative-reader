import os
import re
from collections.abc import Mapping
from typing import Any
from urllib.parse import urlparse

from opensearchpy import OpenSearch, helpers

TESTIMONY_INDEX = "testimony_sentences"
PRE_TAG = "\ue000"
POST_TAG = "\ue001"

HIGHLIGHT = {
    "pre_tags": [PRE_TAG],
    "post_tags": [POST_TAG],
    "require_field_match": False,
    "fields": {"text": {"number_of_fragments": 0}},
}

INDEX_DEFINITION: dict[str, Any] = {
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
            "document_id": {"type": "keyword"},
            "name": {
                "type": "search_as_you_type",
                "analyzer": "folding",
                "fields": {
                    "keyword": {"type": "keyword", "normalizer": "lc"}
                },
            },
            "language": {"type": "keyword", "normalizer": "lc"},
            "interview_date": {"type": "keyword", "normalizer": "lc"},
            "location": {"type": "keyword", "normalizer": "lc"},
            "location_search": {"type": "text", "analyzer": "folding"},
            "duration": {"type": "keyword", "index": False},
            "thumbnail_url": {"type": "keyword", "index": False},
            "metadata_text": {"type": "text", "analyzer": "folding"},
            "idx": {"type": "integer"},
            "tape": {"type": "integer"},
            "start_tc": {"type": "float"},
            "end_tc": {"type": "float"},
            "word_start": {"type": "integer"},
            "text": {
                "type": "text",
                "analyzer": "standard",
                "fields": {"exact": {"type": "text", "analyzer": "standard"}},
            },
            "keyword_labels": {"type": "keyword"},
        }
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
    if client.indices.exists(index=TESTIMONY_INDEX):
        client.indices.put_mapping(
            index=TESTIMONY_INDEX,
            body={
                "properties": {
                    "location_search": INDEX_DEFINITION["mappings"]["properties"][
                        "location_search"
                    ],
                    "metadata_text": INDEX_DEFINITION["mappings"]["properties"][
                        "metadata_text"
                    ],
                }
            },
        )
    else:
        client.indices.create(index=TESTIMONY_INDEX, body=INDEX_DEFINITION)


def index_testimony(
    client: OpenSearch,
    summary: Mapping[str, Any],
    sentences_doc: Mapping[str, Any] | None,
) -> None:
    document_id = str(summary["id"])
    if (
        sentences_doc is not None
        and str(sentences_doc["document_id"]) != document_id
    ):
        raise ValueError(
            "Testimony summary id must match the sentences document_id"
        )

    client.delete_by_query(
        index=TESTIMONY_INDEX,
        body={"query": {"term": {"document_id": document_id}}},
        params={"conflicts": "proceed", "refresh": "false"},
    )

    if sentences_doc is not None:
        actions = []
        word_start = 0
        for sentence in sentences_doc["sentences"]:
            actions.append(
                {
                    "_index": TESTIMONY_INDEX,
                    "_id": f"{document_id}-{sentence['idx']}",
                    "_source": {
                        **summary,
                        "document_id": document_id,
                        "location_search": summary.get("location") or "",
                        "metadata_text": " ".join(
                            str(summary[field])
                            for field in (
                                "id",
                                "name",
                                "language",
                                "interview_date",
                                "location",
                            )
                            if summary.get(field)
                        ),
                        "idx": sentence["idx"],
                        "tape": sentence["tape"],
                        "start_tc": sentence["start_tc"],
                        "end_tc": sentence["end_tc"],
                        "word_start": word_start,
                        "text": sentence["text"],
                        "keyword_labels": sorted(
                            {
                                keyword["label"]
                                for keyword in sentence.get("keywords", [])
                            }
                        ),
                    },
                }
            )
            word_start += len(sentence["text"].split())
        if actions:
            helpers.bulk(client, actions)

    client.indices.refresh(index=TESTIMONY_INDEX)


def text_query(query: str) -> dict[str, Any]:
    """
    Match all query terms in sentence text; bool_prefix treats the final term as a prefix,
    enabling search-as-you-type behavior.
    """
    return {
        "multi_match": {
            "query": query,
            "type": "bool_prefix",
            "fields": ["text"],
            "operator": "and",
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


def word_offset_at_utf16(text: str, offset: int) -> int:
    """
    Return the zero-based index of the word containing a UTF-16 offset.

    OpenSearch highlight offsets are measured in UTF-16 code units, so offsets
    on text with surrogate-pair characters must be compared after encoding the
    corresponding text slices as UTF-16. If the offset is not within a word,
    this function returns the first word's index.

    This ensures correct match highlighting.
    """
    for word_index, match in enumerate(re.finditer(r"\S+", text)):
        start = len(text[: match.start()].encode("utf-16-le")) // 2
        end = len(text[: match.end()].encode("utf-16-le")) // 2
        if start <= offset < end:
            return word_index
    return 0
