import { createEffect, createSignal, For, Show, type Component } from "solid-js";

const Document: Component = () => {
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
      <div class="flex border border-gray-300 p-4">
        <input
        type="file"
        accept=".txt"
        onChange={handleFileChange}
        class="w-full"
        />
      </div>
      }
    >
      <div class="flex flex-col overflow-auto h-full w-full p-4">
        <h2>{file()?.name}</h2>
        <div class="overflow-auto w-full border border-gray-300 flex-grow">
          <For each={splitIntoSentences(content())}>
            {(sentence) => (
              <div class="border-b border-gray-300 py-1 hover:bg-gray-200 w-full">{sentence}</div>
            )}
          </For>
        </div>
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
