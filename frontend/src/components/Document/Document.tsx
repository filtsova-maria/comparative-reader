import { BsChevronLeft, BsChevronRight, BsUpload } from "solid-icons/bs";
import {
  Accessor,
  Component,
  createEffect,
  createSignal,
  Show,
} from "solid-js";
import { Col } from "..";
import UploadInput from "./UploadInput";
import { scrollToSegment } from "./utils";
import Toolbar from "./Toolbar";
import Content from "./Content";

interface IProps {
  uploadPrompt: string;
  readonly?: boolean;
  file: Accessor<File | null>;
  setFile: (file: File | null) => void;
  id: string;
  onResetSearchState: (resetFn: () => void) => void;
}

const styles = {
  // TODO: switch to making search text bold instead of changing background color and use colorful highlighting for semantic search
  activeSegmentColors: "bg-cyan-100 hover:bg-cyan-200",
  inactiveSegmentColors: "bg-white hover:bg-gray-200",
  readonlySegmentColors: "bg-white",
  foundSegmentColors: "bg-yellow-100 hover:bg-yellow-200",
  foundCurrentSegmentColors: "bg-yellow-300 hover:bg-yellow-400",
};

const Document: Component<IProps> = (props) => {
  const [content, setContent] = createSignal<string>("");
  const [searchTerm, setSearchTerm] = createSignal<string>("");
  const [searchResults, setSearchResults] = createSignal<string[]>([]);
  const [currentOccurrence, setCurrentOccurrence] = createSignal<number>(0);

  // TODO: Consider creating a store for search state to be accessed globally instead of weirdly passing props up
  const resetSearchState = () => {
    setSearchTerm("");
    setSearchResults([]);
    setCurrentOccurrence(0);
  };

  createEffect(() => {
    props.onResetSearchState(resetSearchState);
  });

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
    resetSearchState();
  }

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
      setCurrentOccurrence(0);
      scrollToSegment(searchResults()[currentOccurrence()]);
    }
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
        <Toolbar
          fileName={props.file()?.name ?? "No file selected"}
          handleFileChange={handleFileChange}
          searchResults={searchResults}
          currentOccurrence={currentOccurrence}
          setCurrentOccurrence={setCurrentOccurrence}
          onSearchTermChange={onSearchTermChange}
          searchTerm={searchTerm}
        />
        <Content
          content={content}
          id={props.id}
          type={props.readonly ? "target" : "source"}
          searchResults={searchResults}
          currentOccurrence={currentOccurrence}
          getSegmentStyle={getSegmentStyle}
        />
      </Col>
    </Show>
  );
};

export default Document;
