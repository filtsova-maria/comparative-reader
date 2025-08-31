import { Component, JSXElement } from "solid-js";

interface IProps {
  children: JSXElement;
  className?: string;
}

const Label: Component<IProps> = (props) => {
  return (
    <span class={`text-neutral-500 ${props.className || ""}`}>
      {props.children}
    </span>
  );
};

export default Label;
