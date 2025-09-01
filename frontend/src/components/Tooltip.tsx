import { Component, createSignal, JSX, JSXElement } from "solid-js";

interface IProps extends JSX.HTMLAttributes<HTMLDivElement> {
  text: string;
  children: JSXElement;
  class?: string;
  style?: JSX.CSSProperties;
  position?: "top" | "bottom" | "left" | "right";
}

const Tooltip: Component<IProps> = (props) => {
  const [visible, setVisible] = createSignal(false);

  const getPositionClasses = () => {
    switch (props.position) {
      case "top":
        return "bottom-full mb-2 left-1/2 -translate-x-1/2";
      case "bottom":
        return "top-full mt-2 left-1/2 -translate-x-1/2";
      case "left":
        return "right-full mr-2 top-1/2 -translate-y-1/2";
      case "right":
        return "left-full ml-2 top-1/2 -translate-y-1/2";
      default:
        return "bottom-full mb-2 left-1/2 -translate-x-1/2";
    }
  };

  return (
    <div
      class={`relative ${props.class ?? ""}`}
      style={props.style}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      {...props}
    >
      {props.children}
      {visible() && (
        <div
          class={`absolute ${getPositionClasses()} bg-gray-600 text-white text-sm rounded px-2 py-1 shadow-lg`}
        >
          {props.text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
