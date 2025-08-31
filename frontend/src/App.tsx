import { createSignal, Show, type Component } from "solid-js";

interface FileInputProps {}

const Document: Component<FileInputProps> = ({ onFileChange }) => {
  const [file, setFile] = createSignal<File | null>(null);
  async function uploadFile(formData) {
    try {
      const response = await fetch("/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // document.getElementById('uploadStatus').textContent = 'File uploaded successfully!';
      } else {
        // document.getElementById('uploadStatus').textContent = 'Upload failed.';
      }
    } catch (error) {
      console.error("Error:", error);
      // document.getElementById('uploadStatus').textContent = 'An error occurred while uploading the file.';
    }
  }
  return (
    <Show
      when={file() !== null}
      fallback={
        <div class="flex">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      }
    >
      file
    </Show>
  );
};

const App: Component = () => {
  return (
    <div class="grid grid-cols-2 h-screen items-center justify-items-center">
      <Document />
      <Document />
    </div>
  );
};

export default App;
