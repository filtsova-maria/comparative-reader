import { Component, createSignal } from "solid-js";

interface IProps {
  text: string;
  children: any;
}

const Tooltip: Component<IProps> = ({ children, text }) => {
  const [visible, setVisible] = createSignal(false);
  return (
    <div
      class="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible() && (
        <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-sm rounded px-2 py-1 shadow-lg">
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
