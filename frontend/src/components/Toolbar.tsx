import { Component, createSignal } from "solid-js";
import { IconButton } from ".";
import { BsChevronLeft, BsChevronRight } from "solid-icons/bs";

// TODO: extract components
interface IProps {}
const Toolbar: Component<IProps> = () => {
  // TODO: consider setting actual sensitivity onChange and displaying it onInput when backend is implemented
  const [sensitivity, setSensitivity] = createSignal<number>(50);

  return (
    <div class="w-full flex p-4 gap-4">
      <div class="flex items-center gap-2">
        <span class="text-neutral-500">Sensitivity:</span>
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={sensitivity()}
          onInput={(e) => {
            setSensitivity(Number(e.currentTarget.value));
          }}
        />
        <span class="text-neutral-500">{sensitivity()} %</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-neutral-500">Mode:</span>
        <select class="border border-gray-300 rounded px-2 py-2 shadow-md bg-white">
          <option value="similarity">Similarity</option>
          <option value="named-entities">Named entities</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-neutral-500">Occurrences:</span>
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
      </div>
    </div>
  );
};

export default Toolbar;
