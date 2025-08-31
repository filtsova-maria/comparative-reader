import { Component, For, Show } from "solid-js";
import { getSegmentIdByIndex, splitIntoSentences } from "./utils";
import { Row } from "..";
import { TDocumentType, useDocumentStore } from "../../store/DocumentStore";
import { createKeyHold } from "@solid-primitives/keyboard";

const styles = {
  activeSegmentColors: "bg-cyan-100 hover:bg-cyan-200",
  inactiveSegmentColors: "bg-white hover:bg-gray-200",
  readonlySegmentColors: "bg-white",
  foundCurrentSegmentColors: "bg-gray-200",
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

  const getSegmentStyle = (id: string): string => {
    if (documentStore.selectedSegments.includes(id)) {
      return styles.activeSegmentColors;
    }
    if (documentStore[props.type].searchResults.includes(id)) {
      return documentStore[props.type].currentOccurrence ===
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
        <div class="bg-gray-200 h-svh w-6"></div>
      </Show>
    </Row>
  );
};

export default Content;
