import { Component, createContext, useContext } from "solid-js";
import { rootStore } from "./store";

const DocumentContext = createContext(rootStore);

export const DocumentProvider: Component<{ children: any }> = (props) => {
  return (
    <DocumentContext.Provider value={rootStore}>
      {props.children}
    </DocumentContext.Provider>
  );
};

export const useDocumentStore = () => {
  const ctx = useContext(DocumentContext);
  if (!ctx)
    throw new Error("useDocumentStore must be used within a DocumentProvider");
  return ctx;
};
