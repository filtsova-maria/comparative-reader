import { createSignal, type Component } from "solid-js";
import { BottomToolbar, Document, IconButton, Tooltip } from "./components";
import { BsArrowLeftRight } from "solid-icons/bs";
// TODO: use store and context to manage search state
// TODO: custom scrollbar component that highlights segments of interest, think about how to mark and access segments in the document
// TODO: shortcuts for navigation, inputs and actions
const App: Component = () => {
  const [sourceFile, setSourceFile] = createSignal<File | null>(null);
  const [targetFile, setTargetFile] = createSignal<File | null>(null);

  let resetSourceSearchState: () => void;
  let resetTargetSearchState: () => void;

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
          onResetSearchState={(resetFn) => {
            resetSourceSearchState = resetFn;
          }}
        />
        {sourceFile() && targetFile() && (
          <Tooltip text="Swap documents">
            <IconButton
              icon={BsArrowLeftRight}
              onClick={() => {
                const source = sourceFile();
                setSourceFile(targetFile());
                setTargetFile(source);

                resetSourceSearchState();
                resetTargetSearchState();
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
          onResetSearchState={(resetFn) => {
            resetTargetSearchState = resetFn;
          }}
        />
      </div>
      {bothFilesSelected() && <BottomToolbar />}
    </div>
  );
};

export default App;
