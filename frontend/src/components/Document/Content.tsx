import { Component, For, Show } from "solid-js";
import {
  getSegmentIdByIndex,
  getSegmentIndexById,
  splitIntoSentences,
} from "./utils";
import { Row } from "..";
import { TDocumentType, useDocumentStore } from "../../store/DocumentStore";
import { createKeyHold } from "@solid-primitives/keyboard";

// TODO: extract styles
const styles = {
  activeSegmentColors: "bg-cyan-100 hover:bg-cyan-200",
  inactiveSegmentColors: "bg-white hover:bg-gray-200",
  readonlySegmentColors: "bg-white",
  foundCurrentSegmentColors: "bg-gray-200",
  similarityCurrentSegmentColors: "font-bold",
};
const similarityShades = [
  "bg-highlight-1",
  "bg-highlight-2",
  "bg-highlight-3",
  "bg-highlight-4",
  "bg-highlight-5",
];

/**
 * Calculates segment color intensity based on similarity.
 * @param similarity from 0 to 1
 * @param sensitivity from 0 to 100
 * @returns CSS class for segment background color
 */
const calculateSegmentHighlightStyle = (
  similarity: number,
  isHighlighted: boolean,
): string => {
  const index = Math.min(
    Math.ceil(similarity * similarityShades.length) - 1,
    similarityShades.length - 1,
  );
  return similarityShades[index] + (isHighlighted ? " font-bold" : "");
};

interface IProps {
  type: TDocumentType;
  readonly?: boolean;
}

const Content: Component<IProps> = (props) => {
  const { documentStore } = useDocumentStore();
  let isSelecting = false;
  let startSegmentId: string | null = null;
  const ctrlKeyPressed = createKeyHold("Control");

  // TODO: align similarities with segment IDs to display them on the scroll bar
  // TODO: refactor styles function and probably extract it
  const getSegmentStyle = (id: string): string => {
    if (documentStore.selectedSegments.includes(id)) {
      return styles.activeSegmentColors;
    }
    const segmentSimilarity =
      documentStore.similarities[getSegmentIndexById(id)]?.[1];
    if (
      props.type === "target" &&
      segmentSimilarity !== undefined &&
      segmentSimilarity >= documentStore.sensitivity
    ) {
      const isHighlighted =
        documentStore.getVisibleSimilarities()[
          documentStore.currentSimilarityOccurrence
        ][0] === getSegmentIndexById(id);
      return calculateSegmentHighlightStyle(segmentSimilarity, isHighlighted);
    }
    if (documentStore[props.type].searchResults.includes(id)) {
      return documentStore[props.type].currentSearchOccurrence ===
        documentStore[props.type].searchResults.indexOf(id)
        ? styles.foundCurrentSegmentColors
        : styles.inactiveSegmentColors;
    }
    return props.readonly
      ? styles.readonlySegmentColors
      : styles.inactiveSegmentColors;
  };

  const handleMouseDown = (segmentId: string) => {
    isSelecting = true;
    startSegmentId = segmentId;
    documentStore.toggleSegmentSelection(segmentId);
  };

  const handleMouseOver = (segmentId: string) => {
    if (isSelecting && startSegmentId) {
      documentStore.selectSegmentRange(
        startSegmentId,
        segmentId,
        ctrlKeyPressed(),
      );
    }
  };

  const handleMouseUp = async () => {
    isSelecting = false;
    startSegmentId = null;
    if (documentStore.selectedSegments.length === 0) return;
    await documentStore.computeSimilarity();
  };

  const highlightSentence = (s: string) => {
    const searchTerm = documentStore[props.type].searchTerm;
    if (!searchTerm) return s;

    const parts = s.split(new RegExp(`(${searchTerm})`, "gi"));
    return parts.map((part) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <strong class="font-bold">{part}</strong>
      ) : (
        part
      ),
    );
  };

  return (
    <Row className="overflow-hidden items-stretch">
      <div
        id={`${props.type}-text`}
        class="overflow-scroll w-full border border-gray-300 flex-grow bg-white shadow-md"
        onMouseUp={props.type === "source" ? handleMouseUp : undefined}
      >
        <For each={splitIntoSentences(documentStore[props.type].content)}>
          {(sentence, idx) => {
            const segmentId = getSegmentIdByIndex(props.type, idx());

            return (
              <a
                class={`block border-b border-gray-300 p-1 w-full ${getSegmentStyle(segmentId)}`}
                id={segmentId}
                onMouseDown={
                  props.type === "source"
                    ? () => handleMouseDown(segmentId)
                    : undefined
                }
                onMouseOver={
                  props.type === "source"
                    ? () => handleMouseOver(segmentId)
                    : undefined
                }
              >
                {highlightSentence(sentence)}
              </a>
            );
          }}
        </For>
      </div>
      <Show when={props.type === "target"}>
        <div class="bg-gray-200 h-svh w-6">
          {documentStore.similarities.map(([index, value]) => (
            <div>
              {index}: {value}
            </div>
          ))}
        </div>
      </Show>
    </Row>
  );
};

export default Content;
