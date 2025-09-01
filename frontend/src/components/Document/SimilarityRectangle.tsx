import { Component } from "solid-js";
import Tooltip from "../Tooltip";
import { calculateSegmentHighlightStyle } from "./styles";

interface RectangleProps {
  position: number;
  similarity: number;
  onClick: () => void;
}

const SimilarityRectangle: Component<RectangleProps> = (props) => {
  return (
    <Tooltip
      text={`Similarity: ${(props.similarity * 100).toFixed(0)}%`}
      position="left"
      class={`absolute left-0 w-full h-2 cursor-pointer ${calculateSegmentHighlightStyle(
        props.similarity,
        false,
      )}`}
      style={{
        top: `${props.position}%`,
      }}
      onClick={props.onClick}
    >
      <div />
    </Tooltip>
  );
};

export default SimilarityRectangle;
