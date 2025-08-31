import { Component, JSX } from "solid-js";
import InputWrapper from "./InputWrapper";

interface IProps {
  label?: string;
  className?: string;
}

const TextInput: Component<
  IProps & JSX.InputHTMLAttributes<HTMLInputElement>
> = ({ label, className, ...props }) => {
  return (
    <InputWrapper label={label}>
      <input
        type="text"
        {...props}
        class={`border border-gray-300 rounded px-2 py-1 shadow-md ${className || ""}`}
      />
    </InputWrapper>
  );
};

export default TextInput;
