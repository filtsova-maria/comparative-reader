import { Component, createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import {
  getSegmentIdByIndex,
  getSegmentIndexById,
  scrollToSegment,
  splitIntoSentences,
} from "../components/Document/utils";
import {
  apiPost,
  ComputeSimilarityResponse,
  SwapDocumentsResponse,
  UploadSegmentsResponse,
} from "./api";

export interface DocumentState {
  file: File | null;
  content: string;
  searchTerm: string;
  searchResults: string[];
  currentSearchOccurrence: number;
}

type SimilarityEntry = [number, number]; // [segmentIndex, similarity]

// TODO: search can be slow on large documents, consider debouncing
// TODO: refactor store into something more manageable
export interface DocumentStore {
  source: DocumentState;
  target: DocumentState;
  selectedSegments: string[];
  similarities: SimilarityEntry[];
  sensitivity: number; // 0-1
  setSensitivity: (value: number) => void;
  currentSimilarityOccurrence: number;
  setFile: (type: TDocumentType, file: File | null) => Promise<void>;
  updateContent: (type: TDocumentType) => Promise<void>;
  setSearchTerm: (type: TDocumentType, term: string) => void;
  setCurrentSearchOccurrence: (
    type: TDocumentType,
    direction: "next" | "previous",
  ) => void;
  setCurrentSimilarityOccurrence: (direction: "next" | "previous") => void;
  toggleSegmentSelection: (segmentId: string) => void;
  clearSelection: () => void;
  selectSegmentRange: (
    startId: string,
    endId: string,
    append?: boolean,
  ) => void;
  uploadSegments: (type: TDocumentType) => Promise<void>;
  computeSimilarity: () => Promise<void>;
  getVisibleSimilarities: () => SimilarityEntry[];
  swapDocuments: () => Promise<void>;
}

const initialState: DocumentState = {
  file: null,
  content: "",
  searchTerm: "",
  searchResults: [],
  currentSearchOccurrence: 0,
};

const [documentStore, setDocumentStore] = createStore<DocumentStore>({
  source: { ...initialState },
  target: { ...initialState },
  selectedSegments: [],
  similarities: [],
  sensitivity: 0.5,
  currentSimilarityOccurrence: 0,

  setSensitivity(value) {
    setDocumentStore("sensitivity", value);
    setDocumentStore("currentSimilarityOccurrence", 0);
    const firstVisibleSegment = this.getVisibleSimilarities()[0][0];
    if (firstVisibleSegment !== undefined) {
      scrollToSegment(getSegmentIdByIndex("target", firstVisibleSegment));
    }
  },

  async setFile(type, file) {
    setDocumentStore(type, "file", file);
    await this.updateContent(type);
    setDocumentStore(type, {
      searchTerm: "",
      searchResults: [],
      currentSearchOccurrence: 0,
    });
    this.clearSelection();
    // Manually clear the search input fields
    ["source-search-input", "target-search-input"].forEach((id) => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      if (input) input.value = "";
    });
  },

  async updateContent(type) {
    const file = this[type].file;
    if (file) {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = () => {
          setDocumentStore(type, "content", reader.result as string);
          resolve();
        };
        reader.readAsText(file);
      });
    } else {
      setDocumentStore(type, "content", "");
      return Promise.resolve();
    }
  },

  setSearchTerm(type, term) {
    setDocumentStore(type, "searchTerm", term);
    if (term === "") {
      setDocumentStore(type, {
        searchResults: [],
        currentSearchOccurrence: 0,
      });
      return;
    }

    const content = this[type].content.toLowerCase();
    const matches = content
      .split("\n")
      .map((line, index) => (line.includes(term.toLowerCase()) ? index : -1))
      .filter((index) => index !== -1);

    const searchResults = matches.map((index) =>
      getSegmentIdByIndex(type, index),
    );
    const currentSearchOccurrence = 0;
    setDocumentStore(type, {
      searchResults,
      currentSearchOccurrence,
    });
    scrollToSegment(searchResults[currentSearchOccurrence]);
  },

  setCurrentSearchOccurrence(
    type: TDocumentType,
    direction: "next" | "previous",
  ) {
    setDocumentStore(type, (prev) => {
      const current = prev.currentSearchOccurrence;
      const results = prev.searchResults;
      if (direction === "next") {
        if (current < results.length - 1) {
          const next = current + 1;
          scrollToSegment(results[next]);
          return {
            ...prev,
            currentSearchOccurrence: next,
          };
        }
      } else if (direction === "previous") {
        if (current > 0) {
          const next = current - 1;
          scrollToSegment(results[next]);
          return {
            ...prev,
            currentSearchOccurrence: next,
          };
        }
      }
      return prev;
    });
  },

  setCurrentSimilarityOccurrence(direction: "next" | "previous") {
    setDocumentStore((prev) => {
      const current = prev.currentSimilarityOccurrence;
      const visibleSegmentIndexes = this.getVisibleSimilarities();
      if (direction === "next") {
        if (current < visibleSegmentIndexes.length - 1) {
          const next = current + 1;
          const segmentId = getSegmentIdByIndex(
            "target",
            visibleSegmentIndexes[next][0],
          );
          scrollToSegment(segmentId);
          return { currentSimilarityOccurrence: next };
        }
      } else if (direction === "previous") {
        if (current > 0) {
          const next = current - 1;
          const segmentId = getSegmentIdByIndex(
            "target",
            visibleSegmentIndexes[next][0],
          );
          scrollToSegment(segmentId);
          return { currentSimilarityOccurrence: next };
        }
      }
      return prev;
    });
  },

  toggleSegmentSelection(segmentId: string) {
    setDocumentStore(
      "selectedSegments",
      (segments) =>
        segments.includes(segmentId)
          ? segments.filter((id) => id !== segmentId) // Unselect if already selected
          : [...segments, segmentId], // Add to selection if not selected
    );
    if (this.selectedSegments.length === 0) {
      setDocumentStore("similarities", []);
    }
  },

  selectSegmentRange(startId: string, endId: string, append = false) {
    const startIndex = getSegmentIndexById(startId);
    const endIndex = getSegmentIndexById(endId);

    if (startIndex === -1 || endIndex === -1) return;

    const range = Array.from(
      { length: Math.abs(endIndex - startIndex) + 1 },
      (_, i) => {
        const index = startIndex < endIndex ? startIndex + i : endIndex + i;
        return getSegmentIdByIndex("source", index);
      },
    );
    if (!append) {
      setDocumentStore("selectedSegments", range);
    } else {
      setDocumentStore("selectedSegments", (segments) => [
        ...new Set([...segments, ...range]),
      ]);
    }
  },

  clearSelection() {
    setDocumentStore("selectedSegments", []);
    setDocumentStore("similarities", []);
    setDocumentStore("currentSimilarityOccurrence", 0);
  },

  async uploadSegments(type) {
    const segments = splitIntoSentences(this[type].content);

    const result = (await apiPost("/upload-segments", {
      type,
      segments,
    })) as UploadSegmentsResponse;
    console.log(`Uploaded ${type} segments:`, result);
  },

  async computeSimilarity() {
    const selectedIndexes = this.selectedSegments.map((id) => {
      return getSegmentIndexById(id);
    });

    const result = (await apiPost("/compute-similarity", {
      selected_ids: selectedIndexes,
    })) as ComputeSimilarityResponse;

    // Map segment IDs to their similarity scores
    const { similarities, target_segment_ids } = result;
    if (result.similarities) {
      const similarityTuples: SimilarityEntry[] = [];
      target_segment_ids.forEach((id, index) => {
        similarityTuples.push([id, similarities[index]]);
      });
      setDocumentStore("similarities", similarityTuples);
      const firstVisibleId = this.getVisibleSimilarities()[0][0];
      if (firstVisibleId !== undefined) {
        scrollToSegment(getSegmentIdByIndex("target", firstVisibleId));
      }
    }
  },

  getVisibleSimilarities() {
    return this.similarities.filter(
      ([_, similarity]) => similarity >= this.sensitivity,
    );
  },

  async swapDocuments() {
    const result = (await apiPost(
      "/swap-documents",
      {},
    )) as SwapDocumentsResponse;
    console.log(result);

    const oldSource = { ...this.source };
    setDocumentStore("source", this.target);
    setDocumentStore("target", oldSource);
  },
});

const DocumentContext = createContext({ documentStore, setDocumentStore });

export const DocumentProvider: Component<{ children: any }> = (props) => {
  return (
    <DocumentContext.Provider value={{ documentStore, setDocumentStore }}>
      {props.children}
    </DocumentContext.Provider>
  );
};

export const useDocumentStore = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocumentStore must be used within a DocumentProvider");
  }
  return context;
};

export type TDocumentType = "source" | "target";
