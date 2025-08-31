import { createStore } from "solid-js/store";
import { apiPost, ComputeSimilarityResponse } from "./api";
import {
  getSegmentIdByIndex,
  getSegmentIndexById,
  scrollToSegment,
} from "../components/Document/utils";

export type SimilarityEntry = [number, number];

interface SimilarityState {
  similarities: SimilarityEntry[];
  sortedSimilarities: SimilarityEntry[];
  sensitivity: number;
  currentSimilarityOccurrence: number;
}

const [state, setState] = createStore<SimilarityState>({
  similarities: [],
  sortedSimilarities: [],
  sensitivity: 0.5,
  currentSimilarityOccurrence: 0,
});

export const similarityStore = {
  state,
  setSensitivity(value: number) {
    setState("sensitivity", value);
    setState("currentSimilarityOccurrence", 0);
    const firstVisible = this.getVisibleSimilarities()?.[0]?.[0];
    if (firstVisible !== undefined) {
      scrollToSegment(getSegmentIdByIndex("target", firstVisible));
    }
  },
  async computeSimilarity(selectedSegments: string[]) {
    const selectedIndexes = selectedSegments.map(getSegmentIndexById);
    const result = (await apiPost("/compute-similarity", {
      selected_ids: selectedIndexes,
    })) as ComputeSimilarityResponse;
    if (result.similarities) {
      const tuples: SimilarityEntry[] = result.similarities.map((s, i) => [
        i,
        s,
      ]);
      const sorted: SimilarityEntry[] = result.target_segment_ids.map((id) => [
        id,
        result.similarities[id],
      ]);
      setState({
        similarities: tuples,
        sortedSimilarities: sorted,
        currentSimilarityOccurrence: 0,
      });
      const firstVisible = this.getVisibleSimilarities()[0]?.[0];
      if (firstVisible !== undefined)
        scrollToSegment(getSegmentIdByIndex("target", firstVisible));
    }
  },
  getVisibleSimilarities() {
    return state.sortedSimilarities.filter(
      (entry) => entry[1] >= state.sensitivity,
    );
  },
  setCurrentSimilarityOccurrence(direction: "next" | "previous") {
    setState((prev) => {
      const { currentSimilarityOccurrence } = prev;
      const visible = this.getVisibleSimilarities();
      if (
        direction === "next" &&
        currentSimilarityOccurrence < visible.length - 1
      ) {
        const next = currentSimilarityOccurrence + 1;
        scrollToSegment(getSegmentIdByIndex("target", visible[next][0]));
        return { currentSimilarityOccurrence: next };
      }
      if (direction === "previous" && currentSimilarityOccurrence > 0) {
        const next = currentSimilarityOccurrence - 1;
        scrollToSegment(getSegmentIdByIndex("target", visible[next][0]));
        return { currentSimilarityOccurrence: next };
      }
      return prev;
    });
  },
  clearSimilarities() {
    setState({
      similarities: [],
      sortedSimilarities: [],
      currentSimilarityOccurrence: 0,
    });
  },
};
