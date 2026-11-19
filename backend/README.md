# Backend development

Run the commands below from the repository root. The FastAPI backend reads
metadata and processed transcripts from `data/metadata/` and `data/processed/`.
See the root README for transcript preprocessing instructions.

## Set up and build

Create a virtual environment and install its dependencies:

```sh
python3 -m venv venv
. venv/bin/activate
python -m pip install -r backend/requirements.txt
```

To compile-check the Python files:

```sh
python -m compileall -q backend
```

## Run OpenSearch and the API

Start the local OpenSearch and OpenSearch Dashboards services:

```sh
docker compose -f opensearch/compose.yaml up -d
```

OpenSearch listens on
`http://127.0.0.1:9200`, and Dashboards is available at
`http://127.0.0.1:5601`.

Index the testimony metadata and processed sentences, then start the API:

```sh
python -m backend.index_opensearch
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at `http://127.0.0.1:8000`; interactive API documentation
is at `http://127.0.0.1:8000/docs`. To use another OpenSearch URL, set
`OPENSEARCH_URL` before running the indexer and API, for example:

```sh
export OPENSEARCH_URL=http://127.0.0.1:9200
```

Re-run `python -m backend.index_opensearch` after changing metadata,
processed sentences, or the search index mapping. It refreshes the indexed
sentence records for each testimony.

Stop the local search services when finished:

```sh
docker compose -f opensearch/compose.yaml down
```

## Run backend tests

With the virtual environment activated, run the backend unit tests:

```sh
python -m unittest discover -s backend -p 'test_*.py'
```

These tests use mocked OpenSearch calls and do not require the OpenSearch
service to be running.
