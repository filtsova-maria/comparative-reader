import { BsChevronLeft, BsChevronRight, BsUpload } from "solid-icons/bs";
import { Accessor, Component, createSignal, For, Show } from "solid-js";
import IconButton from "./IconButton";

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

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    setFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setContent(reader.result as string);
      };
      reader.readAsText(file);
    }
  }
  // Use test data
  // createEffect(() => {
  //   const longString = "TEST test. test Test test test test. \n".repeat(1000);
  //   const testFile = new File([longString], "testfile.txt", {
  //     type: "text/plain",
  //   });
  //   setFile(testFile);
  //   setContent(longString);
  // });

  function splitIntoSentences(text: string): string[] {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  }

  return (
    <Show
      when={file() !== null}
      fallback={
        <div class="flex border border-gray-300">
          <input
            type="file"
            id={`file-upload-${readonly ? "source" : "target"}`}
            accept=".txt"
            onChange={handleFileChange}
            class="hidden"
          />
          <label
            for={`file-upload-${readonly ? "source" : "target"}`}
            class="p-4 w-full h-full text-center hover:bg-gray-200 cursor-pointer flex flex-col items-center justify-center gap-2"
          >
            <BsUpload />
            {uploadPrompt}
          </label>
        </div>
      }
    >
      <div class="flex flex-col overflow-auto h-full w-full p-4">
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
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
            <span class="overflow-hidden text-ellipsis whitespace-nowrap shrink">
              {file()?.name}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search..."
              class="border border-gray-300 rounded px-2 py-1"
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
          </div>
        </div>
        <div class="overflow-auto w-full border border-gray-300 flex-grow">
          <For each={splitIntoSentences(content())}>
            {(sentence) => (
              <div
                class={`border-b border-gray-300 py-1 w-full ${
                  !readonly ? "hover:bg-gray-200" : ""
                }`}
              >
                {sentence}
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
};

export default Document;
