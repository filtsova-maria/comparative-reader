import { Component, createEffect, Show } from "solid-js";
import { Col, LoadingSpinner } from "..";
import UploadInput from "./UploadInput";
import Toolbar from "./Toolbar";
import Content from "./Content";
import { useDocumentStore } from "../../store/context";
import { TDocumentType } from "../../store";

interface IProps {
  uploadPrompt: string;
  readonly?: boolean;
  type: TDocumentType;
}

const Document: Component<IProps> = (props) => {
  const store = useDocumentStore();
  const doc = props.type === "source" ? store.source : store.target;

  createEffect(() => {
    if (doc.state.file) {
      doc.setFile(doc.state.file);
    }
  });

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    await doc.setFile(file);
    await doc.uploadSegments();
  }

  return (
    <Show
      when={doc.state.file !== null}
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
          fileName={doc.state.file?.name ?? "No file selected"}
          handleFileChange={handleFileChange}
          type={props.type}
        />
        <Show
          when={!doc.state.loading}
          fallback={<LoadingSpinner text="Processing text..." />}
        >
          <Content type={props.type} readonly={props.readonly} />
        </Show>
      </Col>
    </Show>
  );
};

export default Document;
