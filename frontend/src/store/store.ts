import { createDocumentStore } from "./document";
import { similarityStore } from "./similarity";
import { selectionStore } from "./selection";
import { apiPost, SwapDocumentsResponse } from "./api";

const source = createDocumentStore("source");
const target = createDocumentStore("target");

export type RootStore = {
  source: ReturnType<typeof createDocumentStore>;
  target: ReturnType<typeof createDocumentStore>;
  similarity: typeof similarityStore;
  selection: typeof selectionStore;
  swapDocuments: () => Promise<void>;
};

export const rootStore: RootStore = {
  source,
  target,
  similarity: similarityStore,
  selection: selectionStore,

  async swapDocuments() {
    const sourceFile = source.state.file;
    source.setFile(target.state.file);
    target.setFile(sourceFile);
    const result = (await apiPost(
      "/swap-documents",
      {},
    )) as SwapDocumentsResponse;
    console.log(result);
    const oldSource = { ...source.state };
    Object.assign(source.state, target.state);
    Object.assign(target.state, oldSource);
    selectionStore.clearSelection();
    similarityStore.clearSimilarities();
  },
};
