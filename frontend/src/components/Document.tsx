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
import UploadInput from "./UploadInput";

interface IProps {
  uploadPrompt: string;
  readonly?: boolean;
  file: Accessor<File | null>;
  setFile: (file: File | null) => void;
  id: string;
  onResetSearchState: (resetFn: () => void) => void;
}

const Document: Component<IProps> = (props) => {
  const [content, setContent] = createSignal<string>("");
  const [searchTerm, setSearchTerm] = createSignal<string>("");
  const [searchResults, setSearchResults] = createSignal<string[]>([]);
  const [currentOccurrence, setCurrentOccurrence] = createSignal<number>(0);

  const resetSearchState = () => {
    setSearchTerm("");
    setSearchResults([]);
    setCurrentOccurrence(0);
  };

  createEffect(() => {
    props.onResetSearchState(resetSearchState);
  });

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
    if (props.file() !== null) {
      const reader = new FileReader();
      reader.onload = () => {
        setContent(reader.result as string);
      };
      reader.readAsText(props.file()!);
    } else {
      setContent("");
    }
  };

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    props.setFile(file);
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
    return props.readonly
      ? styles.readonlySegmentColors
      : styles.inactiveSegmentColors;
  };

  const scrollToSegment = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onSearchTermChange = (term: string) => {
    if (term === "") {
      setSearchResults([]);
      setCurrentOccurrence(0);
      return;
    }
    const parentElement = document.getElementById(`${props.id}-text`);
    if (parentElement) {
      const children = Array.from(parentElement.children);
      const matches = children
        .filter((child) =>
          child.textContent?.toLowerCase().includes(term.toLowerCase()),
        )
        .map((child) => child.id);
      setSearchResults(matches);
    }
    setCurrentOccurrence(0);
    scrollToSegment(searchResults()[currentOccurrence()]);
  };

  return (
    <Show
      when={props.file() !== null}
      fallback={
        <UploadInput
          id={`file-upload-${props.readonly ? "source" : "target"}`}
          uploadPrompt={props.uploadPrompt}
          handleFileChange={handleFileChange}
        />
      }
    >
      <Col className="overflow-y-hidden items-stretch h-full w-full">
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
              {props.file()?.name}
            </Label>
          </Row>
          <Row>
            {searchResults().length > 0 && (
              <Label className="text-sm">
                {currentOccurrence() + 1}/{searchResults().length}
              </Label>
            )}
            <TextInput
              type="text"
              placeholder="Search..."
              onInput={(e) => {
                onSearchTermChange(e.currentTarget.value);
              }}
              value={searchTerm()}
            />
            <IconButton
              icon={BsChevronLeft}
              disabled={
                searchResults().length === 0 || currentOccurrence() === 0
              }
              onClick={() => {
                setCurrentOccurrence((prev) => {
                  const next = prev - 1;
                  if (next >= 0) {
                    scrollToSegment(searchResults()[next]);
                    return next;
                  }
                  return prev;
                });
              }}
            />
            <IconButton
              icon={BsChevronRight}
              disabled={
                searchResults().length === 0 ||
                currentOccurrence() >= searchResults().length - 1
              }
              onClick={() => {
                setCurrentOccurrence((prev) => {
                  const next = prev + 1;
                  if (prev < searchResults().length - 1) {
                    scrollToSegment(searchResults()[next]);
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
            id={`${props.id}-text`}
            class="overflow-scroll w-full border border-gray-300 flex-grow bg-white shadow-md"
          >
            <For each={splitIntoSentences(content())}>
              {(sentence, idx) => {
                const segmentId = `${props.readonly ? "target" : "source"}-segment-${idx()}`;
                // TODO: highlight search term in sentences
                return (
                  <a
                    class={`block border-b border-gray-300 p-1 w-fuboldll ${getSegmentStyle(segmentId)}`}
                    id={segmentId}
                  >
                    {sentence}
                  </a>
                );
              }}
            </For>
          </div>
          <Show when={props.readonly}>
            <div class="bg-gray-200 h-svh w-6"></div>
          </Show>
        </Row>
      </Col>
    </Show>
  );
};

export default Document;
