import { Component, createSignal, JSXElement } from "solid-js";

interface IProps {
  text: string;
  children: JSXElement;
}

const Tooltip: Component<IProps> = (props) => {
  const [visible, setVisible] = createSignal(false);
  return (
    <div
      class="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {props.children}
      {visible() && (
        <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-sm rounded px-2 py-1 shadow-lg">
          {props.text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
