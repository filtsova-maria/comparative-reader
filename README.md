# Comparative Reader Web App

## Data preprocessing

### Processed sentences JSON

Run the alignment script from the repository root to generate the processed
files:

```sh
python preprocessing/align_tape.py data/transcripts/*.txt
```

The script writes one `data/processed/<document-id>.sentences.json` file per
document ID. Each file combines that document's tapes. Its top-level structure
is:

| Field         | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `version`     | Format version.                                                             |
| `document_id` | Document ID from the transcript filenames.                                  |
| `offset_unit` | Character-offset unit; currently `utf-16` (JavaScript string indices).      |
| `metadata`    | Shared metadata JSON filename for all tapes in the document.                |
| `tapes`       | Per-tape source files, transcript hash, and alignment report.               |
| `report`      | Document-level counts and any warnings.                                     |
| `sentences`   | Combined sentences, ordered by tape and then by position in the transcript. |

Each item in `sentences` contains:

| Field                    | Description                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `idx`                    | Zero-based sentence index across the document.                                                             |
| `tape`                   | Tape number.                                                                                               |
| `start_char`, `end_char` | Transcript offsets for the sentence; the end is exclusive and offsets are local to that tape's transcript. |
| `text`                   | Sentence text from the transcript.                                                                         |
| `start_tc`, `end_tc`     | Approximate start and end time in seconds, local to the tape.                                              |
| `tc_source`              | `matched`, `interpolated`, or `no_tokens`, indicating how timing was assigned.                             |
| `matched_ratio`          | Fraction of the sentence's words matched to subtitle words.                                                |
| `keywords`               | Keywords overlapping the sentence, each with `id`, `label`, and an overlap `weight` from 0 to 1.           |

Each tape's `text_sha256` is the SHA-256 hash of its normalized transcript
text for detecting stale offsets. Tape-level reports include alignment
quality measures and warnings; the document-level report summarizes the tape
and sentence counts and collects any tape warnings.

## Frontend

The Vite, React, and TypeScript single-page application lives in `frontend/`.

```sh
cd frontend
pnpm install
pnpm dev
```

To create and preview a production build:

```sh
pnpm build
pnpm preview
```

## Backend

The FastAPI backend uses OpenSearch for testimony and transcript search. Start the
local OpenSearch service from the repository root:

```sh
docker compose -f opensearch/compose.yaml up -d
```

Install the backend dependencies, index the metadata and processed sentences into OpenSearch and then start the API:

```sh
# (create a virtual environment if there isn't one already)
# python3 -m venv venv
. venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m backend.index_opensearch
python -m uvicorn backend.main:app --reload --port 8000
```

The indexing command creates one sentence-level OpenSearch index. Each sentence
record includes the testimony metadata and its global word anchor. `OPENSEARCH_URL` can override the default `http://localhost:9200` connection URL.
Re-run the indexing command after changing files under `data/metadata`,
`data/processed`, or the search index mapping; it replaces the indexed sentence
records for each testimony.

| Endpoint                                                                           | Behavior                                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `GET /api/testimonies`                                                             | List testimony summaries, sorted by name.                    |
| `GET /api/testimonies?search=joshua`                                               | Search names, case-insensitively.                            |
| `GET /api/testimonies?language=English`                                            | Filter by language, case-insensitively.                      |
| `GET /api/testimonies?location=United+Kingdom`                                     | Filter by location.                                          |
| `GET /api/languages`                                                               | List available languages for a filter control.               |
| `GET /api/testimonies/06052`                                                       | Return the full metadata JSON for a testimony.               |
| `GET /api/testimonies/06052/data`                                                  | Return the processed transcript sentences for one testimony. |
| `GET /api/search/testimonies?search=joshua`                                        | Search names and transcript text.                            |
| `GET /api/search/testimonies?search=home&language=English&location=United+Kingdom` | Search with optional metadata filters.                       |
| `GET /api/search/testimonies/06052?q=home`                                         | Return every matching occurrence with a word anchor.         |

List responses include the string `id` (zero-padded to five digits), name,
language, interview date and location, duration, and
thumbnail URL. Cross-testimony search returns up to three excerpts per person;
each excerpt can open the reader at its matching word anchor. In-document
search returns individual highlighted occurrences that also navigate by word
anchor. The detail endpoint returns the original metadata object. The data
endpoint returns the corresponding `data/processed/*.sentences.json` document.

Interactive API documentation is available at `http://localhost:8000/docs`.

### URL structure

The app uses the pathname to identify the current view and query parameters to
identify the documents and reading positions:

| URL            | Behavior                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `/`            | Redirects to `/read` when a source document is present; otherwise redirects to `/pick/source`. |
| `/pick/source` | Opens mdocument browsing to choose the source document.                                        |
| `/pick/target` | Opens document browsing to choose a target document.                                           |
| `/read`        | Opens the reader. A source document is required; without one, redirects to `/pick/source`.     |

Workspace URLs use these query parameters:

| Parameter | Meaning                                                                                       |
| --------- | --------------------------------------------------------------------------------------------- |
| `s`       | Source document ID.                                                                           |
| `sa`      | Source sentence index (zero-based; defaults to `0` when omitted or invalid).                  |
| `sel`     | Optional selected source-text range as `start-end` character offsets, with the end exclusive. |
| `t`       | Target document ID.                                                                           |
| `ta`      | Target sentence index (zero-based; defaults to `0` when omitted or invalid).                  |

For example, `/read?s=06052&sa=120&sel=120-180&t=38594&ta=45` opens
the reader with source document 06052 and target document 38594 scrolled to their anchor positions. The root route uses the `s` parameter to decide whether to redirect to the reader or the document browser.
