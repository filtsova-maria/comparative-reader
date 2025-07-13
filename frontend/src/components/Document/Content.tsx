import { Component, For, Show } from "solid-js";
import { splitIntoSentences } from "./utils";
import { Row } from "..";
import { TDocumentType, useDocumentStore } from "../../store/DocumentStore";

const styles = {
  // TODO: switch to making search text bold instead of changing background color and use colorful highlighting for semantic search
  activeSegmentColors: "bg-cyan-100 hover:bg-cyan-200",
  inactiveSegmentColors: "bg-white hover:bg-gray-200",
  readonlySegmentColors: "bg-white",
  foundSegmentColors: "bg-yellow-100 hover:bg-yellow-200",
  foundCurrentSegmentColors: "bg-yellow-300 hover:bg-yellow-400",
};

interface IProps {
  type: TDocumentType;
  readonly?: boolean;
}

const Content: Component<IProps> = (props) => {
  const { documentStore } = useDocumentStore();
  // TODO: highlight search results, fix issues with solid-js reactivity
  const getSegmentStyle = (id: string): string => {
    if (documentStore[props.type].searchResults.includes(id)) {
      return documentStore[props.type].currentOccurrence ===
        documentStore[props.type].searchResults.indexOf(id)
        ? styles.foundCurrentSegmentColors
        : styles.foundSegmentColors;
    }
    return props.readonly
      ? styles.readonlySegmentColors
      : styles.inactiveSegmentColors;
  };
  return (
    <Row className="overflow-hidden items-stretch">
      <div
        id={`${props.type}-text`}
        class="overflow-scroll w-full border border-gray-300 flex-grow bg-white shadow-md"
      >
        <For each={splitIntoSentences(documentStore[props.type].content)}>
          {(sentence, idx) => {
            const segmentId = `${props.type}-segment-${idx()}`;
            return (
              <a
                class={`block border-b border-gray-300 p-1 w-full ${getSegmentStyle(segmentId)}`}
                id={segmentId}
              >
                {sentence}
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
