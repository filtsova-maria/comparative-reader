import unittest
from typing import Any, cast
from unittest.mock import Mock, patch

from fastapi import HTTPException
from opensearchpy import OpenSearch

from opensearch_backend import (
    TESTIMONY_INDEX,
    create_client,
    ensure_indices,
    index_testimony,
    parse_ranges,
    word_offset_at_utf16,
)
from main import (
    list_testimony_summaries,
    search_in_testimony,
    search_testimonies,
    to_testimony_data,
)


class FakeIndices:
    def __init__(self) -> None:
        self.refreshed: list[str] = []
        self.existing = set()
        self.created: list[dict[str, object]] = []
        self.deleted: list[str] = []
        self.updated_mappings: list[dict[str, object]] = []

    def exists(self, *, index: str) -> bool:
        return index in self.existing

    def create(self, *, index: str, body: dict[str, object]) -> None:
        self.created.append({"index": index, "body": body})
        self.existing.add(index)

    def put_mapping(self, *, index: str, body: dict[str, object]) -> None:
        self.updated_mappings.append({"index": index, "body": body})

    def delete(self, *, index: str) -> None:
        self.deleted.append(index)
        self.existing.remove(index)

    def refresh(self, *, index: str) -> None:
        self.refreshed.append(index)


class FakeClient:
    def __init__(self) -> None:
        self.indices = FakeIndices()
        self.indexed: list[dict[str, object]] = []
        self.deleted: list[dict[str, object]] = []

    def index(self, **kwargs: object) -> None:
        self.indexed.append(kwargs)

    def delete_by_query(self, **kwargs: object) -> None:
        self.deleted.append(kwargs)


class OpenSearchBackendTests(unittest.TestCase):
    def test_to_testimony_data_includes_tape_durations(self) -> None:
        testimony = to_testimony_data(
            {
                "document_id": "06052",
                "report": {"tapes": 1},
                "tapes": [
                    {"tape": 1, "report": {"tape_duration_s": 1829.0}},
                    {"tape": 2, "report": {"tape_duration_s": 1834.0}},
                ],
                "sentences": [],
            }
        )

        self.assertEqual(
            testimony.tape_durations,
            {1: 1829.0, 2: 1834.0},
        )

    def test_create_client_uses_opensearch_default_http_port(self) -> None:
        with (
            patch.dict("os.environ", {"OPENSEARCH_URL": "http://search"}),
            patch("opensearch_backend.OpenSearch") as open_search,
        ):
            create_client()

        self.assertEqual(
            open_search.call_args.kwargs["hosts"],
            [{"host": "search", "port": 9200}],
        )

    def test_parse_ranges_uses_utf16_code_units(self) -> None:
        self.assertEqual(
            parse_ranges(f"A😀\ue000home\ue001!"),
            [(3, 7)],
        )

    def test_word_offset_uses_utf16_offsets_and_returns_word_index(self) -> None:
        self.assertEqual(word_offset_at_utf16("😀 home again", 3), 1)

    def test_ensure_indices_adds_search_fields_to_existing_index(self) -> None:
        client = FakeClient()
        client.indices.existing.add(TESTIMONY_INDEX)

        ensure_indices(cast(OpenSearch, client))

        self.assertEqual(client.indices.created, [])
        self.assertEqual(
            client.indices.updated_mappings,
            [
                {
                    "index": TESTIMONY_INDEX,
                    "body": {
                        "properties": {
                            "location_search": {
                                "type": "text",
                                "analyzer": "folding",
                            },
                            "metadata_text": {
                                "type": "text",
                                "analyzer": "folding",
                            },
                        }
                    },
                }
            ],
        )

    def test_index_testimony_replaces_sentence_records_with_metadata(self) -> None:
        client = FakeClient()
        sentence = {
            "idx": 4,
            "tape": 2,
            "start_tc": 1.5,
            "end_tc": 3.0,
            "text": "A sentence",
            "keywords": [
                {"label": "Memory"},
                {"label": "Place"},
                {"label": "Memory"},
            ],
        }
        summary = {
            "id": "06052",
            "name": "Ada Example",
            "language": "English",
            "location": "United Kingdom",
        }
        sentences_doc = {"document_id": "06052", "sentences": [sentence]}

        indexed_actions: list[dict[str, Any]] = []

        def capture_actions(*args: Any) -> None:
            indexed_actions.extend(args[1])

        with patch(
            "opensearch_backend.helpers.bulk",
            side_effect=capture_actions,
        ):
            index_testimony(cast(OpenSearch, client), summary, sentences_doc)

        self.assertEqual(client.indexed, [])
        self.assertEqual(client.deleted[0]["index"], TESTIMONY_INDEX)
        self.assertEqual(indexed_actions[0]["_id"], "06052-4")
        self.assertEqual(indexed_actions[0]["_index"], TESTIMONY_INDEX)
        self.assertEqual(indexed_actions[0]["_source"]["id"], "06052")
        self.assertEqual(indexed_actions[0]["_source"]["language"], "English")
        self.assertEqual(
            indexed_actions[0]["_source"]["location_search"],
            "United Kingdom",
        )
        self.assertEqual(
            indexed_actions[0]["_source"]["metadata_text"],
            "06052 Ada Example English United Kingdom",
        )
        self.assertEqual(indexed_actions[0]["_source"]["word_start"], 0)
        self.assertEqual(
            indexed_actions[0]["_source"]["keyword_labels"],
            ["Memory", "Place"],
        )
        self.assertEqual(client.indices.refreshed, [TESTIMONY_INDEX])

    def test_index_testimony_tracks_cumulative_word_anchors(self) -> None:
        client = FakeClient()
        sentences = [
            {"idx": 0, "tape": 1, "start_tc": 0, "end_tc": 1, "text": "one two"},
            {"idx": 1, "tape": 1, "start_tc": 1, "end_tc": 2, "text": "three"},
        ]
        indexed_actions: list[dict[str, Any]] = []

        with patch(
            "opensearch_backend.helpers.bulk",
            side_effect=lambda _client, actions: indexed_actions.extend(actions),
        ):
            index_testimony(
                cast(OpenSearch, client),
                {"id": "06052", "language": "English"},
                {"document_id": "06052", "sentences": sentences},
            )

        self.assertEqual(
            [action["_source"]["word_start"] for action in indexed_actions],
            [0, 2],
        )

    def test_index_testimony_rejects_mismatched_document_ids(self) -> None:
        client = FakeClient()
        with self.assertRaisesRegex(ValueError, "must match"):
            index_testimony(
                cast(OpenSearch, client),
                {"id": "06052", "language": "English"},
                {"document_id": "99999", "sentences": []},
            )
        self.assertEqual(client.indexed, [])

    def test_existing_testimony_list_remains_file_backed(self) -> None:
        metadata = [
            {
                "Testimony": {
                    "IntCode": 1,
                    "LanguageLabel": "English",
                    "InterviewLocation": "Paris",
                },
                "Bio": {"FullName": "Ada"},
            },
            {
                "Testimony": {
                    "IntCode": 2,
                    "LanguageLabel": "English",
                    "InterviewLocation": "Paris",
                },
                "Bio": {"FullName": "Albert"},
            },
            {
                "Testimony": {
                    "IntCode": 3,
                    "LanguageLabel": "Czech",
                    "InterviewLocation": "London",
                },
                "Bio": {"FullName": "Ada French"},
            },
        ]
        fake_os = Mock()
        with (
            patch("main.load_all_metadata", return_value=metadata),
            patch("main.os_client", fake_os),
        ):
            results = list_testimony_summaries(
                search="a",
                language=" ENGLISH ",
                location=" ARIS ",
            )

        self.assertEqual([result.name for result in results], ["Ada", "Albert"])
        fake_os.search.assert_not_called()
        fake_os.msearch.assert_not_called()

    def test_cross_search_merges_matches_from_single_sentence_index(self) -> None:
        name_hit = {
            "_source": {
                "id": "06052",
                "document_id": "06052",
                "name": "Name Match",
                "language": "English",
                "interview_date": None,
                "location": None,
                "duration": None,
                "thumbnail_url": None,
            },
            "inner_hits": {
                "sentences": {
                    "hits": {
                        "hits": [
                            {
                                "_source": {
                                    "idx": 0,
                                    "tape": 1,
                                    "text": "First sentence",
                                    "word_start": 0,
                                }
                            }
                        ]
                    }
                }
            },
        }
        transcript_hit = {
            "_source": {
                "id": "06052",
                "document_id": "06052",
                "name": "Name Match",
                "language": "English",
                "interview_date": None,
                "location": None,
                "duration": None,
                "thumbnail_url": None,
            },
            "inner_hits": {
                "sentences": {
                    "hits": {
                        "total": {"value": 4},
                        "hits": [
                            {
                                "_source": {
                                    "idx": 3,
                                    "tape": 1,
                                    "text": "😀 home",
                                    "word_start": 6,
                                },
                                "highlight": {
                                    "text": ["😀 \ue000home\ue001"]
                                },
                            }
                        ],
                    }
                }
            },
        }
        transcript_only_hit = {
            "_source": {
                "id": "09059",
                "document_id": "09059",
                "name": "Transcript Match",
                "language": "English",
                "interview_date": None,
                "location": None,
                "duration": None,
                "thumbnail_url": None,
            },
            "inner_hits": {
                "sentences": {
                    "hits": {
                        "total": {"value": 2},
                        "hits": [],
                    }
                }
            },
        }
        fake_os = Mock()
        fake_os.msearch.return_value = {
            "responses": [
                {"hits": {"hits": [name_hit]}},
                {"hits": {"hits": [transcript_hit, transcript_only_hit]}},
            ]
        }

        with patch("main.os_client", fake_os):
            results = search_testimonies(
                search="home",
                language=" English ",
                location="Unit",
            )

        self.assertEqual([result.id for result in results], ["06052", "09059"])
        self.assertTrue(results[0].name_match)
        self.assertEqual(results[0].transcript_hits, 4)
        self.assertEqual(results[0].snippets[0].anchor, 7)
        self.assertEqual(
            [(item.start, item.end) for item in results[0].snippets[0].ranges],
            [(3, 7)],
        )
        self.assertFalse(results[1].name_match)
        self.assertEqual(results[1].transcript_hits, 2)
        requests = fake_os.msearch.call_args.kwargs["body"]
        self.assertEqual(
            [request["index"] for request in requests[::2]],
            [TESTIMONY_INDEX, TESTIMONY_INDEX],
        )
        for request in requests[1::2]:
            self.assertEqual(
                request["query"]["bool"]["filter"],
                [
                    {"term": {"language": "English"}},
                    {
                        "multi_match": {
                            "query": "Unit",
                            "type": "bool_prefix",
                            "fields": ["location_search"],
                            "operator": "and",
                        }
                    },
                ],
            )
            self.assertEqual(
                request["collapse"]["inner_hits"]["size"],
                3,
            )
        transcript_query = requests[3]["query"]["bool"]
        self.assertEqual(
            transcript_query["must"],
            [
                {
                    "multi_match": {
                        "query": "home",
                        "type": "bool_prefix",
                        "fields": ["text"],
                        "operator": "and",
                    }
                }
            ],
        )
        metadata_query = requests[1]["query"]["bool"]["must"][0]["bool"]
        self.assertEqual(metadata_query["minimum_should_match"], 1)
        self.assertEqual(
            metadata_query["should"][0]["multi_match"]["type"],
            "bool_prefix",
        )
        self.assertIn(
            "metadata_text",
            metadata_query["should"][0]["multi_match"]["fields"],
        )
        self.assertEqual(
            metadata_query["should"][1]["match"]["metadata_text"]["fuzziness"],
            "AUTO",
        )

    def test_cross_search_reports_uninitialized_index(self) -> None:
        fake_os = Mock()
        fake_os.indices.exists.return_value = False

        with patch("main.os_client", fake_os):
            with self.assertRaises(HTTPException) as error:
                search_testimonies(
                    search="hest",
                    language=None,
                    location=None,
                )

        self.assertEqual(error.exception.status_code, 503)
        self.assertIn("backend.index_opensearch", error.exception.detail)
        fake_os.msearch.assert_not_called()

    def test_cross_search_reports_item_level_opensearch_errors(self) -> None:
        fake_os = Mock()
        fake_os.indices.exists.return_value = True
        fake_os.msearch.return_value = {
            "responses": [
                {"error": {"reason": "index or query error"}},
                {"hits": {"hits": []}},
            ]
        }

        with patch("main.os_client", fake_os):
            with self.assertRaises(HTTPException) as error:
                search_testimonies(
                    search="hest",
                    language=None,
                    location=None,
                )

        self.assertEqual(error.exception.status_code, 503)
        self.assertIn("index or query error", error.exception.detail)

    def test_document_search_returns_each_occurrence_with_word_anchor(self) -> None:
        fake_os = Mock()
        fake_os.search.return_value = {
            "hits": {
                "total": {"value": 1},
                "hits": [
                    {
                        "_source": {
                            "idx": 8,
                            "tape": 2,
                            "text": "😀 home home",
                            "word_start": 10,
                        },
                        "highlight": {
                            "text": [
                                "😀 \ue000home\ue001 \ue000home\ue001"
                            ]
                        },
                    }
                ],
            }
        }
        with patch("main.os_client", fake_os):
            response = search_in_testimony("6052", "hom")

        self.assertEqual(response.total_sentences, 1)
        self.assertEqual([hit.idx for hit in response.hits], [8, 8])
        self.assertEqual([hit.anchor for hit in response.hits], [11, 12])
        self.assertEqual(
            [
                [(item.start, item.end) for item in hit.ranges]
                for hit in response.hits
            ],
            [[(3, 7)], [(8, 12)]],
        )
        query_body = fake_os.search.call_args.kwargs["body"]
        self.assertEqual(fake_os.search.call_args.kwargs["index"], TESTIMONY_INDEX)
        self.assertEqual(
            query_body["query"]["bool"]["filter"],
            [{"term": {"document_id": "06052"}}],
        )
        self.assertEqual(
            query_body["query"]["bool"]["must"],
            [
                {
                    "multi_match": {
                        "query": "hom",
                        "type": "bool_prefix",
                        "fields": ["text"],
                        "operator": "and",
                    }
                }
            ],
        )


if __name__ == "__main__":
    unittest.main()
