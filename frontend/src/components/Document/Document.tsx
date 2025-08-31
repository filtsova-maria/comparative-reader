import { Component, createEffect, Show } from "solid-js";
import { Col } from "..";
import UploadInput from "./UploadInput";
import Toolbar from "./Toolbar";
import Content from "./Content";
import { TDocumentType, useDocumentStore } from "../../store/DocumentStore";

interface IProps {
  uploadPrompt: string;
  readonly?: boolean;
  id: TDocumentType;
}

const Document: Component<IProps> = (props) => {
  const { documentStore } = useDocumentStore();

  createEffect(() => {
    documentStore.updateContent(props.id);
  });

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    documentStore.setFile(props.id, file);
  }

  return (
    <Show
      when={documentStore[props.id].file !== null}
      fallback={
        <UploadInput
          id={props.id}
          uploadPrompt={props.uploadPrompt}
          handleFileChange={handleFileChange}
        />
      }
    >
      <Col className="overflow-y-hidden items-stretch h-full w-full">
        <Toolbar
          fileName={documentStore[props.id].file?.name ?? "No file selected"}
          handleFileChange={handleFileChange}
          id={props.id}
        />
        <Content type={props.id} readonly={props.readonly} />
      </Col>
    </Show>
  );
};

export default Document;
