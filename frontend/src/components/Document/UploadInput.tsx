import { BsUpload } from "solid-icons/bs";
import { Component } from "solid-js";

interface IProps {
  id: string;
  uploadPrompt: string;
  handleFileChange: (
    event: Event & { currentTarget: HTMLInputElement },
  ) => void;
}

const UploadInput: Component<IProps> = ({
  id,
  uploadPrompt,
  handleFileChange,
}) => {
  return (
    <div class="flex border border-gray-300 bg-white">
      <input
        type="file"
        id={id}
        accept=".txt"
        onChange={handleFileChange}
        class="hidden"
      />
      <label
        for={id}
        class="p-4 w-full h-full text-center hover:bg-gray-300 cursor-pointer flex flex-col items-center justify-center gap-2"
      >
        <BsUpload />
        {uploadPrompt}
      </label>
    </div>
  );
};

export default UploadInput;
