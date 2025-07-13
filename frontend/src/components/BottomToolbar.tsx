import { Component, createSignal } from "solid-js";
import { IconButton, Label, RangeInput, Row, SelectInput } from ".";
import { BsChevronLeft, BsChevronRight } from "solid-icons/bs";

interface IProps {}

const BottomToolbar: Component<IProps> = () => {
  // TODO: consider setting actual sensitivity onChange and displaying it onInput when backend is implemented
  const [sensitivity, setSensitivity] = createSignal<number>(50);

  return (
    <div class="w-full flex p-4 gap-4">
      <Row>
        <RangeInput
          label="Sensitivity:"
          min={0}
          max={100}
          step={10}
          value={sensitivity()}
          onInput={(e) => {
            setSensitivity(Number(e.currentTarget.value));
          }}
        />
        <Label>{sensitivity()} %</Label>
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
          onClick={() => {
            // TODO: implement scroll jump to previous similarity occurrence
          }}
        />
        <IconButton
          icon={BsChevronRight}
          onClick={() => {
            // TODO: implement scroll jump to next similarity occurrence
          }}
        />
      </Row>
    </div>
  );
};

export default BottomToolbar;
