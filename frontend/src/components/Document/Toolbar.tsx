import { Accessor, Component, Setter } from "solid-js";
import { Row, Label } from "..";
import IconButton from "../IconButton";
import { BsChevronLeft, BsChevronRight, BsUpload } from "solid-icons/bs";
import TextInput from "../inputs/TextInput";
import { scrollToSegment } from "./utils";

const Toolbar: Component<{
  fileName: string;
  handleFileChange: (e: Event) => void;
  searchResults: Accessor<string[]>;
  currentOccurrence: Accessor<number>;
  setCurrentOccurrence: Setter<number>;
  onSearchTermChange: (term: string) => void;
  searchTerm: Accessor<string>;
}> = (props) => {
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
        {props.searchResults().length > 0 && (
          <Label className="text-sm">
            {props.currentOccurrence() + 1}/{props.searchResults().length}
          </Label>
        )}
        <TextInput
          type="text"
          placeholder="Search..."
          onInput={(e) => {
            props.onSearchTermChange(e.currentTarget.value);
          }}
          value={props.searchTerm()}
        />
        <IconButton
          icon={BsChevronLeft}
          disabled={
            props.searchResults().length === 0 ||
            props.currentOccurrence() === 0
          }
          onClick={() => {
            props.setCurrentOccurrence((prev) => {
              const next = prev - 1;
              if (next >= 0) {
                scrollToSegment(props.searchResults()[next]);
                return next;
              }
              return prev;
            });
          }}
        />
        <IconButton
          icon={BsChevronRight}
          disabled={
            props.searchResults().length === 0 ||
            props.currentOccurrence() >= props.searchResults().length - 1
          }
          onClick={() => {
            props.setCurrentOccurrence((prev) => {
              const next = prev + 1;
              if (prev < props.searchResults().length - 1) {
                scrollToSegment(props.searchResults()[next]);
                return next;
              }
              return prev;
            });
          }}
        />
      </Row>
    </Row>
  );
};

export default Toolbar;
