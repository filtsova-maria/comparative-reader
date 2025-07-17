import { Component, For, Show } from "solid-js";
import { splitIntoSentences } from "./utils";
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
  const getSegmentStyle = (id: string): string => {
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
  return (
    <Row className="overflow-hidden items-stretch">
      <div
        id={`${props.type}-text`}
        class="overflow-scroll w-full border border-gray-300 flex-grow bg-white shadow-md"
      >
        <For each={splitIntoSentences(documentStore[props.type].content)}>
          {(sentence, idx) => {
            const segmentId = `${props.type}-segment-${idx()}`;
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
              <a
                class={`block border-b border-gray-300 p-1 w-full ${getSegmentStyle(segmentId)}`}
                id={segmentId}
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
