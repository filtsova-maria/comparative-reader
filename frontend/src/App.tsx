import { createEffect, createSignal, Show, type Component } from "solid-js";

interface FileInputProps { }

const Document: Component<FileInputProps> = ({ onFileChange }) => {
  const [file, setFile] = createSignal<File | null>(null);
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
  //   const longString = "TEST \n".repeat(10000);
  //   const testFile = new File([longString], "testfile.txt", {
  //     type: "text/plain",
  //   });
  //   setFile(testFile);
  //   setContent(longString);
  // });

  return (
    <Show
      when={file() !== null}
      fallback={
      <div class="flex">
        <input
        type="file"
        accept=".txt"
        onChange={handleFileChange}
        class="w-full"
        />
      </div>
      }
    >
      <div class="flex flex-col overflow-auto max-h-full w-full">
      <h2>{file()?.name}</h2>
      <pre class="overflow-auto w-full">{content()}</pre>
      </div>
    </Show>
  );
};

const App: Component = () => {
  return (
    <div class="grid grid-cols-2 gap-4 h-screen items-center justify-items-center overflow-hidden px-4">
      <Document />
      <Document />
    </div>
  );
};

export default App;
