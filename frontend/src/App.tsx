import { createSignal, type Component } from "solid-js";
import { Document, IconButton, Toolbar, Tooltip } from "./components";
import { BsArrowLeftRight } from "solid-icons/bs";
// TODO: analyze how to select and store segments for searching, scrolling and comparison highlighting, consider scrollIntoView and a custom scrollbar
const App: Component = () => {
  const [sourceFile, setSourceFile] = createSignal<File | null>(null);
  const [targetFile, setTargetFile] = createSignal<File | null>(null);

  const bothFilesSelected = () =>
    sourceFile() !== null && targetFile() !== null;
  return (
    <div class="flex flex-col h-screen w-screen bg-neutral-100">
      <div
        class={`grid ${
          bothFilesSelected() ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-2"
        } gap-1 h-screen items-center justify-items-center overflow-x-auto overflow-y-hidden`}
      >
        <Document
          file={sourceFile}
          setFile={setSourceFile}
          uploadPrompt="Upload a text document."
        />
        {sourceFile() && targetFile() && (
          <Tooltip text="Swap documents">
            <IconButton
              icon={BsArrowLeftRight}
              onClick={() => {
                const source = sourceFile();
                setSourceFile(targetFile());
                setTargetFile(source);
              }}
            />
          </Tooltip>
        )}
        <Document
          file={targetFile}
          setFile={setTargetFile}
          readonly
          uploadPrompt="Upload a document to compare."
        />
      </div>
      {bothFilesSelected() && <Toolbar />}
    </div>
  );
};

export default App;
