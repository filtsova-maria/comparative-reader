import { Component, For, Show } from "solid-js";
import {
  getSegmentIdByIndex,
  scrollToSegment,
  splitIntoSentences,
} from "./utils";
import { Row } from "..";
import { createKeyHold } from "@solid-primitives/keyboard";
import { calculateSegmentHighlightStyle, getSegmentStyle } from "./styles";
import { useDocumentStore } from "../../store/context";
import { TDocumentType } from "../../store";

interface IProps {
  type: TDocumentType;
  readonly?: boolean;
}

const Content: Component<IProps> = (props) => {
  const store = useDocumentStore();
  const doc = props.type === "source" ? store.source : store.target;

  let isSelecting = false;
  let startSegmentId: string | null = null;
  const ctrlKeyPressed = createKeyHold("Control");

  const handleMouseDown = (segmentId: string) => {
    isSelecting = true;
    startSegmentId = segmentId;
    store.selection.toggleSegmentSelection(segmentId);
  };

  const handleMouseOver = (segmentId: string) => {
    if (isSelecting && startSegmentId) {
      store.selection.selectSegmentRange(
        startSegmentId,
        segmentId,
        ctrlKeyPressed(),
      );
    }
  };

  const handleMouseUp = async () => {
    isSelecting = false;
    startSegmentId = null;
    if (store.selection.state.selectedSegments.length === 0) return;
    await store.similarity.computeSimilarity(
      store.selection.state.selectedSegments,
    );
  };

  const highlightSentence = (s: string) => {
    const searchTerm = doc.state.searchTerm;
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
        <For each={splitIntoSentences(doc.state.content)}>
          {(sentence, idx) => {
            const segmentId = getSegmentIdByIndex(props.type, idx());

            return (
              <a
                class={`block border-b border-gray-300 p-1 w-full ${getSegmentStyle(segmentId, props.type, store)}`}
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
        <div class="relative bg-gray-200 h-full w-6">
          <For each={store.similarity.getVisibleSimilarities()}>
            {([segmentId, similarity]) => {
              const totalSegments = store.similarity.state.similarities.length;
              const position = (segmentId / totalSegments) * 100; // Calculate position as a percentage
              const highlightStyle = calculateSegmentHighlightStyle(
                similarity,
                false,
              );
              // TODO: highlight current similarity occurrence
              // TODO: optimize visibleSimilarities access by memoizing
              // TODO: add and debug tooltip

              return (
                <div
                  class={`absolute left-0 w-full h-2 cursor-pointer ${highlightStyle}`}
                  style={{
                    top: `${position}%`,
                  }}
                  onClick={() =>
                    scrollToSegment(getSegmentIdByIndex("target", segmentId))
                  }
                />
              );
            }}
          </For>
        </div>
      </Show>
    </Row>
  );
};

export default Content;
