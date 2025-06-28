import { Component, JSX } from "solid-js";

interface IProps {
  className?: string;
  children: JSX.Element;
}

const Col: Component<IProps> = ({ className, children }) => {
  return (
    <div class={`flex flex-col items-center gap-2 ${className || ""}`}>
      {children}
    </div>
  );
};

export default Col;
