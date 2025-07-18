import { Component, createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import {
  getSegmentIdByIndex,
  getSegmentIndexById,
  scrollToSegment,
} from "../components/Document/utils";

export interface DocumentState {
  file: File | null;
  content: string;
  searchTerm: string;
  searchResults: string[];
  currentOccurrence: number;
  selectedSegments: string[];
}
export interface DocumentStore {
  source: DocumentState;
  target: DocumentState;
  setFile: (type: TDocumentType, file: File | null) => void;
  updateContent: (type: TDocumentType) => void;
  setSearchTerm: (type: TDocumentType, term: string) => void;
  setCurrentOccurrence: (
    type: TDocumentType,
    direction: "next" | "previous",
  ) => void;
  toggleSegmentSelection: (type: TDocumentType, segmentId: string) => void;
  selectMultipleSegments: (type: TDocumentType, segmentIds: string[]) => void;
  clearSelection: (type: TDocumentType) => void;
  selectSegmentRange: (
    type: TDocumentType,
    startId: string,
    endId: string,
  ) => void;
}

const initialState: DocumentState = {
  file: null,
  content: "",
  searchTerm: "",
  searchResults: [],
  currentOccurrence: 0,
  selectedSegments: [],
};

const [documentStore, setDocumentStore] = createStore<DocumentStore>({
  source: { ...initialState },
  target: { ...initialState },

  setFile(type, file) {
    setDocumentStore(type, "file", file);
    documentStore.updateContent(type);
    setDocumentStore(type, {
      searchTerm: "",
      searchResults: [],
      currentOccurrence: 0,
    });
    this.clearSelection(type);
    // Manually clear the search input fields
    ["source-search-input", "target-search-input"].forEach((id) => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      if (input) input.value = "";
    });
  },

  updateContent(type) {
    const file = documentStore[type].file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setDocumentStore(type, "content", reader.result as string);
      };
      reader.readAsText(file);
    } else {
      setDocumentStore(type, "content", "");
    }
  },

  setSearchTerm(type, term) {
    setDocumentStore(type, "searchTerm", term);
    if (term === "") {
      setDocumentStore(type, {
        searchResults: [],
        currentOccurrence: 0,
      });
      return;
    }

    const content = documentStore[type].content.toLowerCase();
    const matches = content
      .split("\n")
      .map((line, index) => (line.includes(term.toLowerCase()) ? index : -1))
      .filter((index) => index !== -1);

    const searchResults = matches.map((index) =>
      getSegmentIdByIndex(type, index),
    );
    const currentOccurrence = 0;
    setDocumentStore(type, {
      searchResults,
      currentOccurrence,
    });
    scrollToSegment(searchResults[currentOccurrence]);
  },

  setCurrentOccurrence(type: TDocumentType, direction: "next" | "previous") {
    setDocumentStore((prev) => {
      const current = prev[type].currentOccurrence;
      const results = prev[type].searchResults;
      if (direction === "next") {
        if (current < results.length - 1) {
          const next = current + 1;
          scrollToSegment(results[next]);
          return {
            [type]: { ...prev[type], currentOccurrence: next },
          };
        }
      } else if (direction === "previous") {
        if (current > 0) {
          const next = current - 1;
          scrollToSegment(results[next]);
          return {
            [type]: { ...prev[type], currentOccurrence: next },
          };
        }
      }
      return prev;
    });
  },

  toggleSegmentSelection(type: TDocumentType, segmentId: string) {
    setDocumentStore(
      type,
      "selectedSegments",
      (segments) =>
        segments.includes(segmentId)
          ? segments.filter((id) => id !== segmentId) // Unselect if already selected
          : [...segments, segmentId], // Add to selection if not selected
    );
  },

  selectMultipleSegments(type: TDocumentType, segmentIds: string[]) {
    setDocumentStore(type, "selectedSegments", (segments) => [
      ...new Set([...segments, ...segmentIds]), // Add unique segment IDs
    ]);
  },

  selectSegmentRange(type: TDocumentType, startId: string, endId: string) {
    const startIndex = getSegmentIndexById(startId);
    const endIndex = getSegmentIndexById(endId);

    if (startIndex === -1 || endIndex === -1) return;

    const range = Array.from(
      { length: Math.abs(endIndex - startIndex) + 1 },
      (_, i) => {
        const index = startIndex < endIndex ? startIndex + i : endIndex + i;
        return getSegmentIdByIndex(type, index);
      },
    );

    setDocumentStore(type, "selectedSegments", range);
  },

  clearSelection(type: TDocumentType) {
    setDocumentStore(type, "selectedSegments", []);
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
