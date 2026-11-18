import unittest
from typing import Any, cast
from unittest.mock import Mock, patch

from opensearchpy import OpenSearch

from opensearch_backend import (
    SENTENCES_INDEX,
    create_client,
    index_testimony,
    parse_ranges,
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

    def test_index_testimony_replaces_sentences_and_copies_search_fields(self) -> None:
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
        summary = {"id": "06052", "language": "English", "experience": "Group"}
        sentences_doc = {"document_id": "06052", "sentences": [sentence]}

        indexed_actions: list[dict[str, Any]] = []

        def capture_actions(*args: Any) -> None:
            indexed_actions.extend(args[1])

        with patch(
            "opensearch_backend.helpers.bulk",
            side_effect=capture_actions,
        ):
            index_testimony(cast(OpenSearch, client), summary, sentences_doc)

        self.assertEqual(client.indexed[0]["id"], "06052")
        self.assertEqual(client.deleted[0]["index"], SENTENCES_INDEX)
        self.assertEqual(indexed_actions[0]["_id"], "06052-4")
        self.assertEqual(
            indexed_actions[0]["_source"]["keyword_labels"],
            ["Memory", "Place"],
        )
        self.assertEqual(client.indices.refreshed, [SENTENCES_INDEX])

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
                "Testimony": {"IntCode": 1, "LanguageLabel": "English"},
                "Bio": {"FullName": "Ada"},
            },
            {
                "Testimony": {"IntCode": 2, "LanguageLabel": "English"},
                "Bio": {"FullName": "Albert"},
            },
            {
                "Testimony": {"IntCode": 3, "LanguageLabel": "French"},
                "Bio": {"FullName": "Ada French"},
            },
        ]
        fake_os = Mock()
        with (
            patch("main.load_all_metadata", return_value=metadata),
            patch("main.os_client", fake_os),
        ):
            results = list_testimony_summaries(
                search="a", language=" ENGLISH "
            )

        self.assertEqual([result.name for result in results], ["Ada", "Albert"])
        fake_os.search.assert_not_called()
        fake_os.msearch.assert_not_called()

    def test_cross_search_merges_name_and_transcript_matches(self) -> None:
        name_hit = {
            "_id": "06052",
            "_source": {
                "name": "Name Match",
                "language": "English",
                "experience": None,
                "interview_date": None,
                "location": None,
                "duration": None,
                "thumbnail_url": None,
            },
        }
        transcript_hit = {
            "fields": {"document_id": ["06052"]},
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
            "fields": {"document_id": ["09059"]},
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
        fake_os.mget.return_value = {
            "docs": [
                {
                    "_id": "09059",
                    "found": True,
                    "_source": {
                        "name": "Transcript Match",
                        "language": "English",
                        "experience": None,
                        "interview_date": None,
                        "location": None,
                        "duration": None,
                        "thumbnail_url": None,
                    },
                }
            ]
        }

        with patch("main.os_client", fake_os):
            results = search_testimonies(search="home", language=" English ")

        self.assertEqual([result.id for result in results], ["06052", "09059"])
        self.assertTrue(results[0].name_match)
        self.assertEqual(results[0].transcript_hits, 4)
        self.assertEqual(
            [(item.start, item.end) for item in results[0].snippets[0].ranges],
            [(3, 7)],
        )
        self.assertFalse(results[1].name_match)
        self.assertEqual(results[1].transcript_hits, 2)

    def test_document_search_normalizes_id_and_returns_highlight_ranges(self) -> None:
        fake_os = Mock()
        fake_os.search.return_value = {
            "hits": {
                "total": {"value": 1},
                "hits": [
                    {
                        "_source": {"idx": 8},
                        "highlight": {"text": ["😀 \ue000home\ue001"]},
                    }
                ],
            }
        }
        with patch("main.os_client", fake_os):
            response = search_in_testimony("6052", "home")

        self.assertEqual(response.total_sentences, 1)
        self.assertEqual(response.hits[0].idx, 8)
        self.assertEqual(
            [(item.start, item.end) for item in response.hits[0].ranges],
            [(3, 7)],
        )
        query_body = fake_os.search.call_args.kwargs["body"]
        self.assertEqual(
            query_body["query"]["bool"]["filter"],
            [{"term": {"document_id": "06052"}}],
        )


if __name__ == "__main__":
    unittest.main()
