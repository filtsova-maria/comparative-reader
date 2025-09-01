import { Component, JSX } from "solid-js";

interface IProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: Component;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

const IconButton: Component<IProps> = (props) => {
  const Icon = props.icon;
  return (
    <button
      class={`px-2 py-2 bg-gray-400 text-white rounded hover:bg-gray-600 shadow-md ${props.className} disabled:bg-gray-300`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      <Icon />
    </button>
  );
};

export default IconButton;
