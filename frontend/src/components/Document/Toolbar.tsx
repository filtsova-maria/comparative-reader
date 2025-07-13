import { Component } from "solid-js";
import { Row, Label } from "..";
import IconButton from "../IconButton";
import { BsChevronLeft, BsChevronRight, BsUpload } from "solid-icons/bs";
import TextInput from "../inputs/TextInput";
import { TDocumentType, useDocumentStore } from "../../store/DocumentStore";

interface IProps {
  fileName: string;
  handleFileChange: (event: Event) => void;
  type: TDocumentType;
}

const Toolbar: Component<IProps> = (props) => {
  const { documentStore } = useDocumentStore();

  return (
    <Row className="justify-between mb-2 m-[2px]">
      <Row className="max-w-[50%]">
        <IconButton
          icon={BsUpload}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".txt";
            input.onchange = (e) => props.handleFileChange(e);
            input.click();
          }}
        />
        <Label className="shrink text-ellipsis overflow-hidden whitespace-nowrap">
          {props.fileName}
        </Label>
      </Row>
      <Row>
        {documentStore[props.type].searchResults.length > 0 && (
          <Label className="text-sm">
            {documentStore[props.type].currentOccurrence + 1}/
            {documentStore[props.type].searchResults.length}
          </Label>
        )}
        <TextInput
          type="text"
          placeholder="Search..."
          onInput={(e) => {
            documentStore.setSearchTerm(props.type, e.currentTarget.value);
          }}
          value={documentStore[props.type].searchTerm}
          id={`${props.type}-search-input`}
        />
        <IconButton
          icon={BsChevronLeft}
          disabled={
            documentStore[props.type].searchResults.length === 0 ||
            documentStore[props.type].currentOccurrence === 0
          }
          onClick={() => {
            documentStore.setCurrentOccurrence(props.type, "previous");
          }}
        />
        <IconButton
          icon={BsChevronRight}
          disabled={
            documentStore[props.type].searchResults.length === 0 ||
            documentStore[props.type].currentOccurrence >=
              documentStore[props.type].searchResults.length - 1
          }
          onClick={() => {
            documentStore.setCurrentOccurrence(props.type, "next");
          }}
        />
      </Row>
    </Row>
  );
};

export default Toolbar;
