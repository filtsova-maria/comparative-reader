import { Component, JSX } from "solid-js";
import InputWrapper from "./InputWrapper";

interface IProps {
  label?: string;
  className?: string;
  min: number;
  max: number;
  step: number;
}

const RangeInput: Component<
  IProps & JSX.InputHTMLAttributes<HTMLInputElement>
> = ({ label, className, min, max, step, ...props }) => {
  return (
    <InputWrapper label={label}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        class={className || ""}
        {...props}
      />
    </InputWrapper>
  );
};

export default RangeInput;
