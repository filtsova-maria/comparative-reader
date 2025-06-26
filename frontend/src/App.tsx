import { createSignal, type Component } from "solid-js";
import Document from "./Document";
// TODO: move all components to a separate folder with index.tsx for easier imports

const App: Component = () => {
  const [sourceFile, setSourceFile] = createSignal<File | null>(null);
  const [targetFile, setTargetFile] = createSignal<File | null>(null);
  return (
    <div class="flex flex-col h-screen w-screen">
      <div class="grid grid-cols-2 gap-4 h-screen items-center justify-items-center overflow-x-auto overflow-y-hidden">
        <Document
          file={sourceFile}
          setFile={setSourceFile}
          uploadPrompt="Upload a text document."
        />
        <Document
          file={targetFile}
          setFile={setTargetFile}
          readonly
          uploadPrompt="Upload a document to compare."
        />
      </div>
      {sourceFile() && targetFile() && (
        <div class="bg-red-300 w-full">Toolbar</div>
      )}
    </div>
  );
};

export default App;
