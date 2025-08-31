import { BsUpload } from "solid-icons/bs";
import { Component } from "solid-js";
import { TDocumentType } from "../../store/document";

interface IProps {
  type: TDocumentType;
  uploadPrompt: string;
  handleFileChange: (event: Event) => void;
}

const UploadInput: Component<IProps> = (props) => {
  const inputId = `file-upload-${props.type}`;

  return (
    <div class="flex border border-gray-300 bg-white">
      <input
        type="file"
        id={inputId}
        accept=".txt"
        onChange={props.handleFileChange}
        class="hidden"
      />
      <label
        for={inputId}
        class="p-4 w-full h-full text-center hover:bg-gray-300 cursor-pointer flex flex-col items-center justify-center gap-2"
      >
        <BsUpload />
        {props.uploadPrompt}
      </label>
    </div>
  );
};

export default UploadInput;
