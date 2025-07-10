import { Accessor, Component, For, Show } from "solid-js";
import { splitIntoSentences } from "./utils";
import { Row } from "..";

const Content: Component<{
  content: Accessor<string>;
  id: string;
  type: "target" | "source";
  searchResults: Accessor<string[]>;
  currentOccurrence: Accessor<number>;
  getSegmentStyle: (id: string) => string;
}> = (props) => {
  // TODO: highlight search results, fix issues with solid-js reactivity
  return (
    <Row className="overflow-hidden items-stretch">
      <div
        id={`${props.id}-text`}
        class="overflow-scroll w-full border border-gray-300 flex-grow bg-white shadow-md"
      >
        <For each={splitIntoSentences(props.content())}>
          {(sentence, idx) => {
            const segmentId = `${props.type}-segment-${idx()}`;
            return (
              <a
                class={`block border-b border-gray-300 p-1 w-full ${props.getSegmentStyle(segmentId)}`}
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
