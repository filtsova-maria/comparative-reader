import { Component, createSignal } from "solid-js";
import { IconButton, Label, RangeInput, Row, SelectInput } from ".";
import { BsChevronLeft, BsChevronRight } from "solid-icons/bs";
import { useDocumentStore } from "../store/context";

interface IProps {}

const BottomToolbar: Component<IProps> = () => {
  const [sensitivity, setSensitivity] = createSignal<number>(0.5);
  const { similarity } = useDocumentStore();

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
            similarity.setSensitivity(Number(e.currentTarget.value));
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
            similarity.state.similarities.length === 0 ||
            similarity.state.currentSimilarityOccurrence === 0
          }
          onClick={() => {
            similarity.setCurrentSimilarityOccurrence("previous");
          }}
        />
        <IconButton
          icon={BsChevronRight}
          disabled={
            similarity.state.similarities.length === 0 ||
            similarity.state.currentSimilarityOccurrence ===
              similarity.getVisibleSimilarities().length - 1
          }
          onClick={() => {
            similarity.setCurrentSimilarityOccurrence("next");
          }}
        />
      </Row>
    </div>
  );
};

export default BottomToolbar;
