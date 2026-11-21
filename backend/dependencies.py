from collections.abc import Generator

from opensearchpy import OpenSearch

from backend.opensearch_backend import create_client


def get_client() -> Generator[OpenSearch, None, None]:
    client = create_client()
    try:
        yield client
    finally:
        client.close()
