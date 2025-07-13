import { Component, createEffect, Show } from "solid-js";
import { Col } from "..";
import UploadInput from "./UploadInput";
import Toolbar from "./Toolbar";
import Content from "./Content";
import { TDocumentType, useDocumentStore } from "../../store/DocumentStore";

interface IProps {
  uploadPrompt: string;
  readonly?: boolean;
  type: TDocumentType;
}

const Document: Component<IProps> = (props) => {
  const { documentStore } = useDocumentStore();

  createEffect(() => {
    documentStore.updateContent(props.type);
  });

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    documentStore.setFile(props.type, file);
  }

  return (
    <Show
      when={documentStore[props.type].file !== null}
      fallback={
        <UploadInput
          type={props.type}
          uploadPrompt={props.uploadPrompt}
          handleFileChange={handleFileChange}
        />
      }
    >
      <Col className="overflow-y-hidden items-stretch h-full w-full">
        <Toolbar
          fileName={documentStore[props.type].file?.name ?? "No file selected"}
          handleFileChange={handleFileChange}
          type={props.type}
        />
        <Content type={props.type} readonly={props.readonly} />
      </Col>
    </Show>
  );
};

export default Document;
