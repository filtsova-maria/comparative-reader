# Comparative Reader Web App

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
| `sa`      | Source reading anchor (integer; defaults to `0` when omitted or invalid).                     |
| `sel`     | Optional selected source-text range as `start-end` character offsets, with the end exclusive. |
| `t`       | Target document ID.                                                                           |
| `ta`      | Target reading anchor (integer; defaults to `0` when omitted or invalid).                     |

For example, `/read?s=06052&a=120&sel=120-180&t=38594&ta=45` opens
the reader with source document 06052 and target document 38594 scrolled to their anchor positions. The root route uses the `s` parameter to decide whether to redirect to the reader or the document browser.
