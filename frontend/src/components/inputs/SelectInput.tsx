import { Component, For, JSX } from "solid-js";
import InputWrapper from "./InputWrapper";

interface IProps {
  label?: string;
  className?: string;
  options: TOption[];
}

type TOption = {
  value: string;
  label: string;
};

const SelectInput: Component<
  IProps & JSX.SelectHTMLAttributes<HTMLSelectElement>
> = ({ label, className, options, ...props }) => {
  return (
    <InputWrapper label={label}>
      <select
        class={`border border-gray-300 rounded px-2 py-2 shadow-md bg-white ${className || ""}`}
        {...props}
      >
        <For each={options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
    </InputWrapper>
  );
};

export default SelectInput;
