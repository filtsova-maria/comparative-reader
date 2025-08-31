import { type Component } from "solid-js";
import { BottomToolbar, Document, IconButton, Tooltip } from "./components";
import { BsArrowLeftRight } from "solid-icons/bs";
import { useDocumentStore } from "./store/context";
// TODO: custom scrollbar component that highlights segments of interest, think about how to mark and access segments in the document
// TODO: shortcuts for navigation, inputs and actions
const App: Component = () => {
  const { source, target, selection, swapDocuments } = useDocumentStore();

  const bothFilesSelected = () =>
    source.state.file !== null && target.state.file !== null;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      selection.clearSelection();
    }
  });

  return (
    <div class="flex flex-col h-screen w-screen bg-neutral-100 p-4">
      <div
        class={`grid ${
          bothFilesSelected() ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-2"
        } gap-2 h-screen items-center justify-items-center overflow-x-auto`}
      >
        <Document uploadPrompt="Upload a text document." type="source" />
        {source.state.file && target.state.file && (
          <Tooltip text="Swap documents">
            <IconButton
              icon={BsArrowLeftRight}
              onClick={async () => await swapDocuments()}
            />
          </Tooltip>
        )}
        <Document
          readonly
          uploadPrompt="Upload a document to compare."
          type="target"
        />
      </div>
      {bothFilesSelected() && <BottomToolbar />}
    </div>
  );
};

export default App;
