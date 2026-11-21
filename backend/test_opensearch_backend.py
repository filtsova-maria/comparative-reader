import json
import tempfile
import unittest
from pathlib import Path
from typing import Any, cast
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from opensearchpy import OpenSearch

from backend.anchors import word_count, word_offset_at_utf16
from backend.dependencies import get_client
from backend.ids import normalize_id
from backend.main import app, get_cors_origins
from backend.opensearch_backend import (
    INDEX_DEFINITION,
    TESTIMONY_INDEX,
    create_client,
    ensure_indices,
    index_testimony,
    index_testimonies,
    parse_ranges,
)
from backend.repository import load_all_metadata, to_testimony_data


class BackendTests(unittest.TestCase):
    def setUp(self) -> None:
        app.dependency_overrides.clear()
        self.addCleanup(app.dependency_overrides.clear)

    def client_with(self, client: Mock) -> TestClient:
        app.dependency_overrides[get_client] = lambda: cast(OpenSearch, client)
        return TestClient(app)

    def test_normalize_id_uses_one_five_digit_form(self) -> None:
        self.assertEqual(normalize_id(6052), "06052")
        self.assertEqual(normalize_id("00017"), "00017")
        with self.assertRaises(ValueError):
            normalize_id("../6052")

    def test_word_anchors_use_javascript_whitespace(self) -> None:
        self.assertEqual(word_count("one\ufefftwo\u001cthree"), 2)
        self.assertEqual(word_offset_at_utf16("😀 home again", 3), 1)

    def test_word_offset_uses_utf16_code_units(self) -> None:
        self.assertEqual(word_offset_at_utf16("a 😀 home", 5), 2)
        self.assertEqual(word_offset_at_utf16("one\u001ctwo", 4), 0)

    def test_parse_ranges_uses_utf16_code_units(self) -> None:
        self.assertEqual(
            parse_ranges(f"A😀\ue000home\ue001!"),
            [(3, 7)],
        )

    def test_to_testimony_data_leaves_sentence_validation_to_fastapi(self) -> None:
        sentence = {"idx": 1, "word_start": 3, "text": "one two"}
        testimony = to_testimony_data(
            {
                "document_id": "6052",
                "report": {"tapes": 1},
                "tapes": [
                    {"tape": 1, "report": {"tape_duration_s": 1829.0}},
                    {"tape": 2, "report": {"tape_duration_s": 1834.0}},
                ],
                "sentences": [sentence],
            }
        )

        self.assertEqual(
            testimony["tape_durations"],
            {1: 1829.0, 2: 1834.0},
        )
        self.assertEqual(testimony["sentences"][0], sentence)
        self.assertIsInstance(testimony["sentences"][0], dict)

    def test_create_client_uses_opensearch_default_http_port(self) -> None:
        with (
            patch.dict("os.environ", {"OPENSEARCH_URL": "http://search"}),
            patch("backend.opensearch_backend.OpenSearch") as open_search,
        ):
            create_client()

        self.assertEqual(
            open_search.call_args.kwargs["hosts"],
            [{"host": "search", "port": 9200}],
        )

    def test_cors_origins_are_configurable(self) -> None:
        with patch.dict("os.environ", {"CORS_ORIGINS": "https://one, https://two"}):
            self.assertEqual(
                get_cors_origins(),
                ["https://one", "https://two"],
            )
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(
                get_cors_origins(),
                ["http://localhost:5173", "http://127.0.0.1:5173"],
            )

    def test_ensure_indices_creates_current_version(self) -> None:
        client = Mock()
        client.indices.exists.return_value = False

        ensure_indices(cast(OpenSearch, client))

        client.indices.create.assert_called_once_with(
            index=TESTIMONY_INDEX,
            body=INDEX_DEFINITION,
        )

    def test_ensure_indices_keeps_existing_current_index(self) -> None:
        client = Mock()
        client.indices.exists.return_value = True

        ensure_indices(cast(OpenSearch, client))

        client.indices.create.assert_not_called()

    def test_index_testimony_uses_preprocessed_word_anchors(self) -> None:
        actions = index_testimony(
            {
                "id": "6052",
                "name": "Ada Example",
                "language": "English",
                "location": "United Kingdom",
            },
            {
                "document_id": "06052",
                "sentences": [
                    {
                        "idx": 4,
                        "tape": 2,
                        "start_tc": 1.5,
                        "end_tc": 3.0,
                        "word_start": 12,
                        "text": "A sentence",
                        "keywords": [
                            {"label": "Memory"},
                            {"label": "Place"},
                            {"label": "Memory"},
                        ],
                    }
                ],
            },
        )

        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0]["_index"], TESTIMONY_INDEX)
        self.assertEqual(actions[0]["_id"], "06052-4")
        self.assertEqual(actions[0]["_source"]["id"], "06052")
        self.assertEqual(actions[0]["_source"]["word_start"], 12)
        self.assertEqual(
            actions[0]["_source"]["metadata_text"],
            "06052 Ada Example English United Kingdom",
        )
        self.assertEqual(
            actions[0]["_source"]["keyword_labels"],
            ["Memory", "Place"],
        )

    def test_index_testimony_rejects_mismatched_document_ids(self) -> None:
        with self.assertRaisesRegex(ValueError, "must match"):
            index_testimony(
                {"id": "06052"},
                {"document_id": "99999", "sentences": []},
            )

    def test_index_testimonies_bulk_indexes_and_refreshes_once(self) -> None:
        client = Mock()
        client.indices.exists.return_value = True
        indexed_actions: list[dict[str, Any]] = []

        with patch(
            "backend.opensearch_backend.helpers.bulk",
            side_effect=lambda _client, actions: indexed_actions.extend(actions),
        ) as bulk:
            indexed_count = index_testimonies(
                cast(OpenSearch, client),
                [
                    (
                        {"id": "06052"},
                        {
                            "document_id": "06052",
                            "sentences": [
                                {
                                    "idx": 0,
                                    "tape": 1,
                                    "start_tc": 0,
                                    "end_tc": 1,
                                    "word_start": 0,
                                    "text": "one",
                                }
                            ],
                        },
                    ),
                    ({"id": "09059"}, None),
                ],
            )

        self.assertEqual(indexed_count, 1)
        bulk.assert_called_once()
        self.assertEqual(len(indexed_actions), 1)
        client.delete_by_query.assert_called_once_with(
            index=TESTIMONY_INDEX,
            body={"query": {"match_all": {}}},
            params={"conflicts": "proceed", "refresh": "false"},
        )
        client.indices.refresh.assert_called_once_with(index=TESTIMONY_INDEX)

    def test_testimony_list_filters_and_paginates(self) -> None:
        metadata = [
            {
                "Testimony": {
                    "IntCode": identifier,
                    "LanguageLabel": language,
                    "InterviewLocation": location,
                },
                "Bio": {"FullName": name},
            }
            for identifier, name, language, location in [
                (1, "Ada", "English", "Paris"),
                (2, "Albert", "English", "Paris"),
                (3, "Ada French", "Czech", "London"),
            ]
        ]
        with patch(
            "backend.routers.testimonies.load_all_metadata",
            return_value=metadata,
        ) as load:
            with TestClient(app) as client:
                response = client.get(
                    "/api/testimonies",
                    params={
                        "search": "a",
                        "language": " ENGLISH ",
                        "location": " ARIS ",
                        "limit": 1,
                        "offset": 1,
                    },
                )
                languages = client.get("/api/languages")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["name"] for item in response.json()], ["Albert"])
        self.assertEqual(languages.json(), ["Czech", "English"])
        self.assertEqual(load.call_count, 2)

    def test_metadata_cache_does_not_reload_files(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            metadata_dir = Path(temporary_directory)
            (metadata_dir / "1.json").write_text('{"id": 1}', encoding="utf-8")
            with (
                patch("backend.repository.METADATA_DIR", metadata_dir),
                patch("backend.repository.json.loads", wraps=json.loads) as loads,
            ):
                load_all_metadata.cache_clear()
                first = load_all_metadata()
                (metadata_dir / "2.json").write_text('{"id": 2}', encoding="utf-8")
                second = load_all_metadata()
                load_all_metadata.cache_clear()

        self.assertIs(first, second)
        self.assertEqual(len(second), 1)
        self.assertEqual(loads.call_count, 1)

    def test_testimony_data_route_validates_response_once(self) -> None:
        sentence = {
            "idx": 0,
            "tape": 1,
            "word_start": 0,
            "start_char": 0,
            "end_char": 3,
            "text": "one",
            "start_tc": 0.0,
            "end_tc": 1.0,
            "tc_source": "matched",
            "matched_ratio": 1.0,
            "keywords": [],
        }
        payload = {
            "document_id": "06052",
            "report": {"tapes": 1},
            "tapes": [{"tape": 1, "report": {"tape_duration_s": 10.0}}],
            "sentences": [sentence],
        }
        with patch(
            "backend.routers.testimonies.load_testimony_data",
            return_value=payload,
        ):
            with TestClient(app) as client:
                response = client.get("/api/testimonies/6052/data")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sentences"], [sentence])
        self.assertEqual(response.json()["tape_durations"], {"1": 10.0})

    def test_cross_search_uses_dependency_override(self) -> None:
        name_hit = {
            "_source": {
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
        client = Mock()
        client.indices.exists.return_value = True
        client.msearch.return_value = {
            "responses": [
                {"hits": {"hits": [name_hit]}},
                {"hits": {"hits": [transcript_hit]}},
            ]
        }

        with self.client_with(client) as test_client:
            response = test_client.get(
                "/api/search/testimonies",
                params={
                    "search": "home",
                    "language": " English ",
                    "location": "Unit",
                },
            )

        result = response.json()[0]
        self.assertEqual(response.status_code, 200)
        self.assertEqual(result["transcript_hits"], 4)
        self.assertEqual(result["snippets"][0]["anchor"], 7)
        requests = client.msearch.call_args.kwargs["body"]
        self.assertEqual(
            [request["index"] for request in requests[::2]],
            [TESTIMONY_INDEX, TESTIMONY_INDEX],
        )
        self.assertEqual(
            requests[1]["query"]["bool"]["filter"],
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

    def test_cross_search_reports_uninitialized_index(self) -> None:
        client = Mock()
        client.indices.exists.return_value = False

        with self.client_with(client) as test_client:
            response = test_client.get(
                "/api/search/testimonies",
                params={"search": "home"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("backend.index_opensearch", response.json()["detail"])
        client.msearch.assert_not_called()

    def test_document_search_reports_truncated_hits(self) -> None:
        client = Mock()
        client.indices.exists.return_value = True
        client.search.return_value = {
            "hits": {
                "total": {"value": 2},
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

        with self.client_with(client) as test_client:
            response = test_client.get(
                "/api/search/testimonies/6052",
                params={"q": "hom"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["truncated"])
        self.assertEqual(response.json()["total_sentences"], 2)
        self.assertEqual(response.json()["hits"][0]["anchor"], 11)
        query_body = client.search.call_args.kwargs["body"]
        self.assertEqual(client.search.call_args.kwargs["index"], TESTIMONY_INDEX)
        self.assertEqual(query_body["size"], 5000)
        self.assertTrue(query_body["track_total_hits"])
        self.assertEqual(
            query_body["query"]["bool"]["filter"],
            [{"term": {"document_id": "06052"}}],
        )

    def test_document_search_rejects_non_numeric_id(self) -> None:
        client = Mock()
        with self.client_with(client) as test_client:
            response = test_client.get(
                "/api/search/testimonies/abc",
                params={"q": "term"},
            )

        self.assertEqual(response.status_code, 404)
        client.indices.exists.assert_not_called()


if __name__ == "__main__":
    unittest.main()
