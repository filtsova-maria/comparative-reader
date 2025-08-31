import { Component, For, Show } from "solid-js";
import { getSegmentIdByIndex, splitIntoSentences } from "./utils";
import { Row } from "..";
import { TDocumentType, useDocumentStore } from "../../store/DocumentStore";
import { createKeyHold } from "@solid-primitives/keyboard";
import { getSegmentStyle } from "./styles";

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
  // TODO: debug highlighting when sensitivity is changed

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
                class={`block border-b border-gray-300 p-1 w-full ${getSegmentStyle(segmentId, props.type, documentStore)}`}
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
