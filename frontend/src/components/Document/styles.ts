import { DocumentStore, TDocumentType } from "../../store/DocumentStore";
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
  documentStore: DocumentStore,
): string => {
  if (type === "source") {
    if (documentStore.selectedSegments.includes(id)) {
      return styles.source.selectedSegment;
    }
    if (documentStore.source.searchResults.includes(id)) {
      return documentStore.source.currentSearchOccurrence ===
        documentStore.source.searchResults.indexOf(id)
        ? styles.common.searchCurrentSegment
        : styles.source.baseSegment;
    }
  } else {
    const segmentSimilarity =
      documentStore.similarities[getSegmentIndexById(id)]?.[1];
    // TODO: cache getVisibleSimilarities result
    const visibleSimilarities = documentStore.getVisibleSimilarities();
    const currentSimilarityOccurrence =
      visibleSimilarities[documentStore.currentSimilarityOccurrence];
    if (
      segmentSimilarity !== undefined &&
      currentSimilarityOccurrence !== undefined &&
      visibleSimilarities.length > 0 &&
      segmentSimilarity >= documentStore.sensitivity
    ) {
      const isHighlighted =
        visibleSimilarities[documentStore.currentSimilarityOccurrence][0] ===
        getSegmentIndexById(id);
      return calculateSegmentHighlightStyle(segmentSimilarity, isHighlighted);
    }
    if (documentStore.target.searchResults.includes(id)) {
      return documentStore.target.currentSearchOccurrence ===
        documentStore.target.searchResults.indexOf(id)
        ? styles.common.searchCurrentSegment
        : styles.target.baseSegment;
    }
  }
  return styles.target.baseSegment;
};
