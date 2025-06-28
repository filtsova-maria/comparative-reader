import { Component, JSXElement } from "solid-js";

interface IProps {
  children: JSXElement;
  className?: string;
}

const Label: Component<IProps> = ({ children, className }) => {
  return <span class={`text-neutral-500 ${className || ""}`}>{children}</span>;
};

export default Label;
