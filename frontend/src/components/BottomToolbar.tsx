import { Component, createSignal } from "solid-js";
import { IconButton, Label, RangeInput, Row, SelectInput } from ".";
import { BsChevronLeft, BsChevronRight } from "solid-icons/bs";
import { useDocumentStore } from "../store/DocumentStore";

interface IProps {}

const BottomToolbar: Component<IProps> = () => {
  const [sensitivity, setSensitivity] = createSignal<number>(0.5);
  const { documentStore } = useDocumentStore();

  return (
    <div class="w-full flex p-4 gap-4">
      <Row>
        <RangeInput
          label="Sensitivity:"
          min={0}
          max={1}
          step={0.1}
          value={sensitivity()}
          onInput={(e) => {
            setSensitivity(Number(e.currentTarget.value));
          }}
          onChange={(e) => {
            documentStore.setSensitivity(Number(e.currentTarget.value));
          }}
        />
        <Label>{sensitivity() * 100} %</Label>
      </Row>
      <SelectInput
        label="Mode:"
        options={[
          { value: "similarity", label: "Similarity" },
          { value: "named-entities", label: "Named Entities" },
        ]}
      />
      <Row>
        <Label>Occurrences:</Label>
        <IconButton
          icon={BsChevronLeft}
          disabled={
            documentStore.similarities.length === 0 ||
            documentStore.currentSimilarityOccurrence === 0
          }
          onClick={() => {
            documentStore.setCurrentSimilarityOccurrence("previous");
          }}
        />
        <IconButton
          icon={BsChevronRight}
          disabled={
            documentStore.similarities.length === 0 ||
            documentStore.currentSimilarityOccurrence ===
              documentStore.getVisibleSimilarities().length - 1
          }
          onClick={() => {
            documentStore.setCurrentSimilarityOccurrence("next");
          }}
        />
      </Row>
    </div>
  );
};

export default BottomToolbar;
