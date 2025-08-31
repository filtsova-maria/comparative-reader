import { Component } from "solid-js";

interface IconButtonProps {
  icon: Component;
  onClick: () => void;
  className?: string;
}

const IconButton: Component<IconButtonProps> = ({
  icon: Icon,
  onClick,
  className = "",
}) => {
  return (
    <button
      class={`px-2 py-2 bg-gray-400 text-white rounded hover:bg-gray-600 ${className}`}
      onClick={onClick}
    >
      <Icon />
    </button>
  );
};

export default IconButton;
