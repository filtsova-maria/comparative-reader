# Comparative Reader Web App

## Data preprocessing

### Processed sentences JSON

Run the alignment script from the repository root with all transcript TXT files. Each TXT expects a matching
same-basename VTT file, and the script finds metadata by document ID:

```sh
. venv/bin/activate
python -m pip install -r preprocessing/requirements.txt
python preprocessing/align_tape.py data/transcripts/*.txt
```

The script groups tapes by the `<document-id>-<tape-number>` filename prefix
and writes one combined file per testimony to
`data/processed/<five-digit-document-id>.sentences.json`. Use `--metadata-dir`
or `--out-dir` to override the default directories.

Top-level JSON structure:

| Field         | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `version`     | Processed document format version (`2`).                                  |
| `document_id` | Five-digit document ID from the transcript filename.                      |
| `offset_unit` | `utf-16`, matching JavaScript string indices.                             |
| `metadata`    | Metadata JSON filename.                                                   |
| `tapes`       | Per-tape source TXT/VTT names, transcript hash, and alignment report.     |
| `report`      | Document-level tape and sentence counts, plus any tape warnings.          |
| `sentences`   | Combined sentences ordered by tape, with indices continuous across tapes. |

Transcript text is decoded as UTF-8 with a BOM removed, normalized to NFC, and
has line endings converted to LF before offsets and the hash are calculated.
Sentence boundaries are detected within each non-empty line, ending at `.`,
`!`, `?`, or `…` (including immediately following closing punctuation), or at
the end of the line.

The script normalizes words for comparison by case-folding and removing
diacritics. Matching runs of at least three words inherit approximate times
from their VTT cues, interpolated across each cue. Other words are interpolated
between matched words. Words outside the matched range use the nearest matched
time. If no words match, the script exits with an error. Pass `--strict` to
exit with status 2 when the generated report contains warnings, the output
file is still written.

Each sentence in `sentences` contains:

| Field                    | Description                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `idx`                    | Zero-based sentence index across the combined document.                                                                   |
| `tape`                   | Tape number.                                                                                                              |
| `start_char`, `end_char` | Offsets into that tape's canonical transcript; end is exclusive.                                                          |
| `text`                   | Sentence text from the transcript.                                                                                        |
| `start_tc`, `end_tc`     | Approximate start and end time in seconds, local to the tape.                                                             |
| `tc_source`              | `matched` if the first word matched a cue, `interpolated` if it did not, or `no_tokens` if wordless.                      |
| `matched_ratio`          | Fraction of the sentence's transcript words in matching runs of at least three words.                                     |
| `keywords`               | Keywords from metadata segments overlapping at least 30% of the sentence; each has `id`, `label`, and weight from 0 to 1. |

The report includes the overall token match ratio, longest unmatched word run,
sentence counts (including interpolated and wordless sentences), number of
sentences with keywords, largest gap between sentence start times, last
sentence end time, tape duration when available, and warnings. A warning is
emitted when the token match ratio is below 0.90 or the maximum gap exceeds
120 seconds.

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
| `/pick/source` | Opens document browsing to choose the source document.                                         |
| `/pick/target` | Opens document browsing to choose a target document.                                           |
| `/read`        | Opens the reader. A source document is required; without one, redirects to `/pick/source`.     |

Workspace URLs use these query parameters:

| Parameter | Meaning                                                                                   |
| --------- | ----------------------------------------------------------------------------------------- |
| `s`       | Source document ID.                                                                       |
| `sa`      | Source word anchor (zero-based; defaults to `0` when omitted or invalid).                 |
| `sq`      | Source document full-text search query; matching words are highlighted in the reader.     |
| `t`       | Target document ID.                                                                       |
| `ta`      | Target word anchor (zero-based; defaults to `0` when omitted or invalid).                 |
| `tq`      | Target document full-text search query; matching words are highlighted in the reader.     |

For example, `/read?s=06052&sa=120&sq=home&t=38594&ta=45&tq=memory` opens
both documents at their word anchors and restores each pane's search and
highlights. The root route uses `s` to decide whether to redirect to the reader
or the document browser.
