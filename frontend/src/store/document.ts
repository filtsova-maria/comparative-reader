import { createStore } from "solid-js/store";
import {
  getSegmentIdByIndex,
  scrollToSegment,
  splitIntoSentences,
} from "../components/Document/utils";
import { apiPost, UploadSegmentsResponse } from "./api";
import { similarityStore } from "./similarity";
import { selectionStore } from "./selection";

export interface DocumentState {
  file: File | null;
  content: string;
  searchTerm: string;
  searchResults: string[];
  currentSearchOccurrence: number;
  loading: boolean;
}

const initialDocumentState: DocumentState = {
  file: null,
  content: "",
  searchTerm: "",
  searchResults: [],
  currentSearchOccurrence: 0,
  loading: false,
};

export type TDocumentType = "source" | "target";
// TODO: search can be slow on large documents, consider debouncing
export function createDocumentStore(type: TDocumentType) {
  const [state, setState] = createStore<DocumentState>({
    ...initialDocumentState,
  });

  return {
    state,
    setFile: async (file: File | null) => {
      setState("file", file);
      if (file) {
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = () => {
            setState("content", reader.result as string);
            resolve();
          };
          reader.readAsText(file);
        });
      } else {
        setState("content", "");
      }
      setState({
        searchTerm: "",
        searchResults: [],
        currentSearchOccurrence: 0,
      });
      selectionStore.clearSelection();
      similarityStore.clearSimilarities();
    },
    setSearchTerm: (term: string) => {
      setState("searchTerm", term);
      if (term === "") {
        setState({ searchResults: [], currentSearchOccurrence: 0 });
        return;
      }
      const content = state.content.toLowerCase();
      const matches = content
        .split("\n")
        .map((line, index) => (line.includes(term.toLowerCase()) ? index : -1))
        .filter((index) => index !== -1);

      const searchResults = matches.map((index) =>
        getSegmentIdByIndex(type, index),
      );
      setState({ searchResults, currentSearchOccurrence: 0 });
      if (searchResults.length > 0) scrollToSegment(searchResults[0]);
    },
    setCurrentSearchOccurrence: (direction: "next" | "previous") => {
      setState((prev) => {
        const { currentSearchOccurrence, searchResults } = prev;
        if (
          direction === "next" &&
          currentSearchOccurrence < searchResults.length - 1
        ) {
          const next = currentSearchOccurrence + 1;
          scrollToSegment(searchResults[next]);
          return { currentSearchOccurrence: next };
        }
        if (direction === "previous" && currentSearchOccurrence > 0) {
          const next = currentSearchOccurrence - 1;
          scrollToSegment(searchResults[next]);
          return { currentSearchOccurrence: next };
        }
        return prev;
      });
    },
    uploadSegments: async () => {
      setState("loading", true);
      try {
        const segments = splitIntoSentences(state.content);
        const result = (await apiPost("/upload-segments", {
          type,
          segments,
        })) as UploadSegmentsResponse;
        console.log(`Uploaded ${type} segments:`, result);
      } catch (err) {
        console.error(err);
      } finally {
        setState("loading", false);
      }
    },
  };
}
