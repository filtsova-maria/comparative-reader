import { createSignal, type Component } from "solid-js";
import { Document, IconButton, Toolbar, Tooltip } from "./components";
import { BsArrowLeftRight } from "solid-icons/bs";
// TODO: consider state management for search parameters possibly using a store or context
// TODO: custom scrollbar component that highlights segments of interest, think about how to mark and access segments in the document
// TODO: shortcuts for navigation, inputs and actions
const App: Component = () => {
  const [sourceFile, setSourceFile] = createSignal<File | null>(null);
  const [targetFile, setTargetFile] = createSignal<File | null>(null);

  const bothFilesSelected = () =>
    sourceFile() !== null && targetFile() !== null;
  return (
    <div class="flex flex-col h-screen w-screen bg-neutral-100 p-4">
      <div
        class={`grid ${
          bothFilesSelected() ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-2"
        } gap-2 h-screen items-center justify-items-center overflow-x-auto`}
      >
        <Document
          file={sourceFile}
          setFile={setSourceFile}
          uploadPrompt="Upload a text document."
          id="source"
        />
        {sourceFile() && targetFile() && (
          <Tooltip text="Swap documents">
            <IconButton
              icon={BsArrowLeftRight}
              onClick={() => {
                // TODO: reset search parameters and scroll positions
                // Consider using a store or context for managing search state
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
          id="target"
        />
      </div>
      {bothFilesSelected() && <Toolbar />}
    </div>
  );
};

export default App;
