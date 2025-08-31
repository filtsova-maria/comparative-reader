import { Component } from "solid-js";
import { Row, Label } from "..";
import IconButton from "../IconButton";
import { BsChevronLeft, BsChevronRight, BsUpload } from "solid-icons/bs";
import TextInput from "../inputs/TextInput";
import { useDocumentStore } from "../../store/context";
import { TDocumentType } from "../../store";

interface IProps {
  fileName: string;
  handleFileChange: (event: Event) => void;
  type: TDocumentType;
}

const Toolbar: Component<IProps> = (props) => {
  const store = useDocumentStore();
  const doc = props.type === "source" ? store.source : store.target;

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
        {doc.state.searchResults.length > 0 && (
          <Label className="text-sm">
            {doc.state.currentSearchOccurrence + 1}/
            {doc.state.searchResults.length}
          </Label>
        )}
        <TextInput
          type="text"
          placeholder="Search..."
          onInput={(e) => {
            doc.setSearchTerm(e.currentTarget.value);
          }}
          value={doc.state.searchTerm}
          id={`${props.type}-search-input`}
        />
        <IconButton
          icon={BsChevronLeft}
          disabled={
            doc.state.searchResults.length === 0 ||
            doc.state.currentSearchOccurrence === 0
          }
          onClick={() => {
            doc.setCurrentSearchOccurrence("previous");
          }}
        />
        <IconButton
          icon={BsChevronRight}
          disabled={
            doc.state.searchResults.length === 0 ||
            doc.state.currentSearchOccurrence >=
              doc.state.searchResults.length - 1
          }
          onClick={() => {
            doc.setCurrentSearchOccurrence("next");
          }}
        />
      </Row>
    </Row>
  );
};

export default Toolbar;
