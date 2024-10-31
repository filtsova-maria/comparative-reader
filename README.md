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

