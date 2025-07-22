# Comparative Reader Web App

## Problem Statement

The project is a UI concept designed to enable comparative reading of documents, with an emphasis on intuitive user interaction and effective visualization of textual similarities. Users will be able to load two documents side-by-side, with the UI dynamically highlighting similar text sections. The comparison should identify text overlap, paraphrasing, and other similarity aspects.

**Target Operating System**: Cross-platform (Browser-based).

## Functionality

- **User Document Comparison**: Users can select two documents from a preprocessed document corpus.
- **Similarity Visualization**: Similar sections between documents are highlighted based on similarity scores.

### Program Structure

- **Languages and Frameworks**:
  - **Frontend**: TypeScript, [Solid.js](https://www.solidjs.com/).
  - **Backend**: Python, [FastAPI](https://fastapi.tiangolo.com/).
  - **Testing Data**: The [Memorise](https://ufal.mff.cuni.cz/grants/memorise) corpus, [ELITR Minuting Corpus](https://lindat.mff.cuni.cz/repository/xmlui/handle/11234/1-4692#).

- **Frontend**:
  - **UI Component Library**: Reusable components for document upload, text visualization, settings, etc.
  - **Data Visualization Module**: Manages the display of highlighted similarities.
  
- **Backend**:
  - **Document Processing Module**: Handles segmentation and processing.
  - **Similarity Engine**: Provides similarity models.
  - **API Endpoints**: Handles frontend request, serves document data and similarity scores.

## Installation

You need [yarn](https://classic.yarnpkg.com/lang/en/docs/install/) to install and run the frontend part of the application and [python3](https://www.python.org/downloads/) for the backend.

### Frontend

1. **Navigate to the frontend directory**:
  ```bash
  cd frontend
  ```

2. **Install dependencies**:
  ```bash
  yarn install
  ```

3. **Run the development server**:
  ```bash
  yarn dev
  ```
  Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Backend

1. **Navigate to the backend directory**:
  ```bash
  cd backend
  ```

2. **Create a virtual environment**:
  ```bash
  python -m venv venv
  ```

3. **Activate the virtual environment**:
  - On Windows:
    ```bash
    .venv\Scripts\activate
    ```
  - On macOS/Linux:
    ```bash
    source .venv/bin/activate
    ```

4. **Install dependencies**:
  ```bash
  pip install -r requirements.txt
  ```

5. **Run the backend server**:
  ```bash
  fastapi dev main.py
  ```
  The backend server will be running at [http://localhost:8000](http://localhost:8000). You can access API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

### Running the Full Application

1. **Start the backend server** as described in the Backend section.
2. **Start the frontend development server** as described in the Frontend section.
3. Open [http://localhost:3000](http://localhost:3000) to use the application.