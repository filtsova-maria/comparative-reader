import { createStore } from "solid-js/store";
import {
  getSegmentIdByIndex,
  getSegmentIndexById,
} from "../components/Document/utils";
import { similarityStore } from "./similarity";

const [state, setState] = createStore({ selectedSegments: [] as string[] });

export const selectionStore = {
  state,
  toggleSegmentSelection(segmentId: string) {
    setState("selectedSegments", (segments) =>
      segments.includes(segmentId)
        ? segments.filter((id) => id !== segmentId)
        : [...segments, segmentId],
    );
    if (state.selectedSegments.length === 0) {
      similarityStore.clearSimilarities();
    }
  },
  clearSelection() {
    setState("selectedSegments", []);
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

    setState("selectedSegments", (segments) =>
      append ? [...new Set([...segments, ...range])] : range,
    );
  },
};
