import { RootStore, TDocumentType } from "../../store";
import { getSegmentIndexById } from "./utils";

const styles = {
  common: {
    searchCurrentSegment: "bg-gray-200",
  },
  source: {
    baseSegment: "bg-white hover:bg-gray-200",
    selectedSegment: "bg-cyan-100 hover:bg-cyan-200",
  },
  target: {
    baseSegment: "bg-white",
    similarityCurrentSegment: "font-bold",
    similarityShades: [
      "bg-highlight-1",
      "bg-highlight-2",
      "bg-highlight-3",
      "bg-highlight-4",
      "bg-highlight-5",
    ],
  },
};

/**
 * Calculates segment color intensity based on similarity.
 * @param similarity from 0 to 1
 * @param sensitivity from 0 to 100
 * @returns CSS class for segment background color
 */
export const calculateSegmentHighlightStyle = (
  similarity: number,
  isHighlighted: boolean,
): string => {
  const index = Math.min(
    Math.ceil(similarity * styles.target.similarityShades.length) - 1,
    styles.target.similarityShades.length - 1,
  );
  return (
    styles.target.similarityShades[index] + (isHighlighted ? " font-bold" : "")
  );
};

export const getSegmentStyle = (
  id: string,
  type: TDocumentType,
  store: RootStore,
): string => {
  const {
    selection: { state: selectionState },
    source: { state: sourceState },
    similarity: { state: similarityState, getVisibleSimilarities },
    target: { state: targetState },
  } = store;

  if (type === "source") {
    if (selectionState.selectedSegments.includes(id)) {
      return styles.source.selectedSegment;
    }
    if (sourceState.searchResults.includes(id)) {
      return sourceState.currentSearchOccurrence ===
        sourceState.searchResults.indexOf(id)
        ? styles.common.searchCurrentSegment
        : styles.source.baseSegment;
    }
  } else {
    const segmentSimilarity =
      similarityState.similarities[getSegmentIndexById(id)]?.[1];
    const visibleSimilarities = getVisibleSimilarities();
    const currentSimilarityOccurrence =
      visibleSimilarities[similarityState.currentSimilarityOccurrence];
    if (
      segmentSimilarity !== undefined &&
      currentSimilarityOccurrence !== undefined &&
      visibleSimilarities.length > 0 &&
      segmentSimilarity >= similarityState.sensitivity
    ) {
      const isHighlighted =
        visibleSimilarities[similarityState.currentSimilarityOccurrence][0] ===
        getSegmentIndexById(id);
      return calculateSegmentHighlightStyle(segmentSimilarity, isHighlighted);
    }
    if (targetState.searchResults.includes(id)) {
      return targetState.currentSearchOccurrence ===
        targetState.searchResults.indexOf(id)
        ? styles.common.searchCurrentSegment
        : styles.target.baseSegment;
    }
  }
  return styles.target.baseSegment;
};
