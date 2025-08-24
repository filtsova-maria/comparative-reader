import { Component } from "solid-js";

interface IProps {
  text?: string;
}

const LoadingSpinner: Component<IProps> = (props) => (
  <div class="flex items-center justify-center h-full">
    <div class="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
    <span class="ml-2 text-gray-400">{props.text}</span>
  </div>
);

export default LoadingSpinner;
