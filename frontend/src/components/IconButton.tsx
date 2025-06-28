import { Component } from "solid-js";

interface IProps {
  icon: Component;
  onClick: () => void;
  className?: string;
}

const IconButton: Component<IProps> = ({
  icon: Icon,
  onClick,
  className = "",
}) => {
  return (
    <button
      class={`px-2 py-2 bg-gray-400 text-white rounded hover:bg-gray-600 shadow-md ${className}`}
      onClick={onClick}
    >
      <Icon />
    </button>
  );
};

export default IconButton;
