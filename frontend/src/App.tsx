import type { Component } from "solid-js";

const UploadDocument = () => {
  return (
    <div>
      <input type="file" />
    </div>
  );
};

const App: Component = () => {
  return (
    <div class="text-lg font-thin bg-green-500">
      <UploadDocument />
      <UploadDocument />
    </div>
  );
};

export default App;
