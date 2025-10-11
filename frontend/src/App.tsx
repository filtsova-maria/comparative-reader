import { onMount, type Component } from "solid-js";
import { BottomToolbar, Document, IconButton, Tooltip } from "./components";
import { BsArrowLeftRight } from "solid-icons/bs";
import { useDocumentStore } from "./store/context";
import { similarityStore } from "./store/modules/similarity";
import { apiGet } from "./store/api";
// TODO: shortcuts for navigation, inputs and actions
// TODO: update documentation, describe architecture and state management
const App: Component = () => {
  const { source, target, selection, swapDocuments } = useDocumentStore();

  const bothFilesSelected = () =>
    source.state.file !== null && target.state.file !== null;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      selection.clearSelection();
      similarityStore.clearSimilarities();
    }
  });

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const sourceFileName = params.get("source");
    const targetFileName = params.get("target");

    if (sourceFileName) {
      await loadFileFromPath(source, sourceFileName);
    }
    if (targetFileName) {
      await loadFileFromPath(target, targetFileName);
    }
  });

  const loadFileFromPath = async (
    store: typeof source | typeof target,
    filePath: string,
  ) => {
    try {
      const response = await apiGet(
        `/fetch-file?file_name=${encodeURIComponent(filePath)}`,
      );

      const file = new File([response.content], response.filename, {
        type: "text/plain",
      });
      await store.setFile(file);
      await store.uploadSegments();
    } catch (error) {
      console.error(error);
    }
  };

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
