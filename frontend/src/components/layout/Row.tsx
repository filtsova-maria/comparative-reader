import { Component, JSX } from "solid-js";

interface IProps {
  className?: string;
  children: JSX.Element;
}

const Row: Component<IProps> = ({ className, children }) => {
  return (
    <div class={`flex items-center gap-2 ${className || ""}`}>{children}</div>
  );
};

export default Row;
