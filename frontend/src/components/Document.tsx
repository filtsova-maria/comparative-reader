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
}

const Document: Component<IProps> = ({
  uploadPrompt,
  file,
  setFile,
  readonly = false,
}) => {
  const [content, setContent] = createSignal<string>("");

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

  function splitIntoSentences(text: string): string[] {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  }

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
      <Col className="overflow-auto items-stretch h-full w-full">
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
              }}
            />
            <IconButton
              icon={BsChevronRight}
              onClick={() => {
                // TODO: implement scroll jump to next sentence
              }}
            />
          </Row>
        </Row>
        <div class="overflow-auto w-full border border-gray-300 flex-grow bg-white shadow-md">
          <For each={splitIntoSentences(content())}>
            {(sentence) => (
              <div
                class={`border-b border-gray-300 p-1 w-full ${
                  !readonly ? "hover:bg-gray-200" : ""
                }`}
              >
                {sentence}
              </div>
            )}
          </For>
        </div>
      </Col>
    </Show>
  );
};

export default Document;
