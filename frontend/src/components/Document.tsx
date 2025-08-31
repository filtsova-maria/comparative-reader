import { BsChevronLeft, BsChevronRight, BsUpload } from "solid-icons/bs";
import {
  Accessor,
  Component,
  createEffect,
  createSignal,
  For,
  Show,
} from "solid-js";
import { Col, IconButton, Label, Row, TextInput } from ".";

interface IProps {
  uploadPrompt: string;
  readonly?: boolean;
  file: Accessor<File | null>;
  setFile: (file: File | null) => void;
  id: string;
}

const Document: Component<IProps> = ({
  uploadPrompt,
  file,
  setFile,
  readonly = false,
  id,
}) => {
  // TODO: on search, store segments that match the search term
  // When clicking on the next/previous buttons, scroll to the next/previous search result
  const [content, setContent] = createSignal<string>("");
  const [currentOccurrence, setCurrentOccurrence] = createSignal<number>(0);

  const styles = {
    // TODO: switch to making search text bold instead of changing background color
    // and use colorful highlighting for semantic search
    activeSegmentColors: "bg-cyan-100 hover:bg-cyan-200",
    inactiveSegmentColors: "bg-white hover:bg-gray-200",
    readonlySegmentColors: "bg-white",
  };

  createEffect(() => {
    updateContent();
  });

  const updateContent = () => {
    if (file() !== null) {
      const reader = new FileReader();
      reader.onload = () => {
        setContent(reader.result as string);
      };
      reader.readAsText(file()!);
    } else {
      setContent("");
    }
  };

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    setFile(file);
    updateContent();
  }

  const splitIntoSentences = (text: string): string[] => {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  };

  const getSegmentStyle = (idx: number): string => {
    if (idx === currentOccurrence()) {
      return styles.activeSegmentColors;
    } else if (readonly) {
      return styles.readonlySegmentColors;
    } else {
      return styles.inactiveSegmentColors;
    }
  };

  return (
    <Show
      when={file() !== null}
      fallback={
        <div class="flex border border-gray-300 bg-white">
          <input
            type="file"
            id={`file-upload-${readonly ? "source" : "target"}`}
            accept=".txt"
            onChange={handleFileChange}
            class="hidden"
          />
          <label
            for={`file-upload-${readonly ? "source" : "target"}`}
            class="p-4 w-full h-full text-center hover:bg-gray-300 cursor-pointer flex flex-col items-center justify-center gap-2"
          >
            <BsUpload />
            {uploadPrompt}
          </label>
        </div>
      }
    >
      <Col className="overflow-hidden items-stretch h-full w-full">
        <Row className="justify-between mb-2 m-[2px]">
          <Row className="max-w-[50%]">
            <IconButton
              icon={BsUpload}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".txt";
                input.onchange = (e) => handleFileChange(e);
                input.click();
              }}
            />
            <Label className="shrink text-ellipsis overflow-hidden whitespace-nowrap">
              {file()?.name}
            </Label>
          </Row>
          <Row>
            <TextInput
              type="text"
              placeholder="Search..."
              onInput={(e) => {
                // TODO: save sentences that match the search term
                // Allow to jump to the next match
              }}
            />
            <IconButton
              icon={BsChevronLeft}
              onClick={() => {
                // TODO: implement scroll jump to previous sentence
                document
                  .getElementById(
                    `${readonly ? "target" : "source"}-segment-${currentOccurrence() - 1}`,
                  )
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                setCurrentOccurrence((prev) => prev - 1);
              }}
            />
            <IconButton
              icon={BsChevronRight}
              onClick={() => {
                // TODO: implement scroll jump to next sentence
                // TODO: handle edge cases where currentOccurrence is the first or last sentence
                document
                  .getElementById(
                    `${readonly ? "target" : "source"}-segment-${currentOccurrence() + 1}`,
                  )
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                setCurrentOccurrence((prev) => prev + 1);
              }}
            />
          </Row>
        </Row>
        <Row className="overflow-hidden items-stretch">
          <div
            id={`${id}-text`}
            class="overflow-scroll w-full border border-gray-300 flex-grow bg-white shadow-md"
          >
            <For each={splitIntoSentences(content())}>
              {(sentence, idx) => (
                <a
                  class={`block border-b border-gray-300 p-1 w-full ${getSegmentStyle(idx())}`}
                  id={`${readonly ? "target" : "source"}-segment-${idx()}`}
                >
                  {sentence}
                </a>
              )}
            </For>
          </div>
          <Show when={readonly}>
            <div class="bg-gray-200 h-svh w-6"></div>
          </Show>
        </Row>
      </Col>
    </Show>
  );
};

export default Document;
