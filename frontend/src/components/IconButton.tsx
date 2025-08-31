import { Component } from "solid-js";

interface IProps {
  icon: Component;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

const IconButton: Component<IProps> = ({
  icon: Icon,
  onClick,
  className = "",
  disabled = false,
}) => {
  return (
    <button
      class={`px-2 py-2 bg-gray-400 text-white rounded hover:bg-gray-600 shadow-md ${className} disabled:bg-gray-300`}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon />
    </button>
  );
};

export default IconButton;
