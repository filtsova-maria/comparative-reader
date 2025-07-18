import { Component, For, Show } from "solid-js";
import { getSegmentIdByIndex, splitIntoSentences } from "./utils";
import { Row } from "..";
import { TDocumentType, useDocumentStore } from "../../store/DocumentStore";

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

  const getSegmentStyle = (id: string): string => {
    if (documentStore[props.type].selectedSegments.includes(id)) {
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
    documentStore.toggleSegmentSelection(props.type, segmentId);
  };

  const handleMouseOver = (segmentId: string) => {
    if (isSelecting && startSegmentId) {
      documentStore.selectSegmentRange(props.type, startSegmentId, segmentId);
      // TODO: add selection removal via ESC
      // TODO: only allow selection on the readonly document
      // TODO: allow for additional selection with ctrl
    }
  };

  const handleMouseUp = () => {
    isSelecting = false;
    startSegmentId = null;
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
        onMouseUp={handleMouseUp}
      >
        <For each={splitIntoSentences(documentStore[props.type].content)}>
          {(sentence, idx) => {
            const segmentId = getSegmentIdByIndex(props.type, idx());

            return (
              <a
                class={`block border-b border-gray-300 p-1 w-full ${getSegmentStyle(segmentId)}`}
                id={segmentId}
                onMouseDown={() => handleMouseDown(segmentId)}
                onMouseOver={() => handleMouseOver(segmentId)}
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
