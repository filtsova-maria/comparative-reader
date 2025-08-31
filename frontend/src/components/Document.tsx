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
  const [content, setContent] = createSignal<string>("");
  const [searchTerm, setSearchTerm] = createSignal<string>("");
  const [searchResults, setSearchResults] = createSignal<string[]>([]);
  const [currentOccurrence, setCurrentOccurrence] = createSignal<number>(0);

  // TODO: refactor component, extract scrolling logic to a separate function
  // and use it in both search and segment click handlers

  const styles = {
    // TODO: switch to making search text bold instead of changing background color and use colorful highlighting for semantic search
    activeSegmentColors: "bg-cyan-100 hover:bg-cyan-200",
    inactiveSegmentColors: "bg-white hover:bg-gray-200",
    readonlySegmentColors: "bg-white",
    foundSegmentColors: "bg-yellow-100 hover:bg-yellow-200",
    foundCurrentSegmentColors: "bg-yellow-300 hover:bg-yellow-400",
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

  const getSegmentStyle = (id: string): string => {
    if (searchResults().includes(id)) {
      return currentOccurrence() === searchResults().indexOf(id)
        ? styles.foundCurrentSegmentColors
        : styles.foundSegmentColors;
    }
    return readonly
      ? styles.readonlySegmentColors
      : styles.inactiveSegmentColors;
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
                // TODO: consider debouncing this input
                // TODO: show number of occurrences found and current occurrence
                setSearchTerm(e.currentTarget.value);
                if (e.currentTarget.value === "") {
                  setSearchResults([]);
                  setCurrentOccurrence(0);
                  return;
                }
                const parentElement = document.getElementById(`${id}-text`);
                if (parentElement) {
                  const children = Array.from(parentElement.children);
                  const matches = children
                    .filter((child) =>
                      child.textContent
                        ?.toLowerCase()
                        .includes(searchTerm().toLowerCase()),
                    )
                    .map((child) => child.id);
                  setSearchResults(matches);
                }
                setCurrentOccurrence(0);
                document
                  .getElementById(searchResults()[currentOccurrence()])
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              value={searchTerm()}
            />
            <IconButton
              icon={BsChevronLeft}
              // TODO: debug disabled state reactive updates
              // disabled={
              //   searchResults().length === 0 || currentOccurrence() === 0
              // }
              onClick={() => {
                setCurrentOccurrence((prev) => {
                  const next = prev - 1;
                  if (next >= 0) {
                    const scrollElement = document.getElementById(
                      searchResults()[next],
                    );
                    scrollElement?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    return next;
                  }
                  return prev;
                });
              }}
            />
            <IconButton
              icon={BsChevronRight}
              // disabled={
              //   searchResults().length === 0 ||
              //   currentOccurrence() >= searchResults().length - 1
              // }
              onClick={() => {
                setCurrentOccurrence((prev) => {
                  const next = prev + 1;
                  if (prev < searchResults().length - 1) {
                    const scrollElement = document.getElementById(
                      searchResults()[next],
                    );
                    scrollElement?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    return next;
                  }
                  return prev;
                });
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
              {(sentence, idx) => {
                const segmentId = `${readonly ? "target" : "source"}-segment-${idx()}`;
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
          <Show when={readonly}>
            <div class="bg-gray-200 h-svh w-6"></div>
          </Show>
        </Row>
      </Col>
    </Show>
  );
};

export default Document;
