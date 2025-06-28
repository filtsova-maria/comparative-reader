import { Component, JSX } from "solid-js";
import { Label, Row } from "..";

interface IProps {
  label?: string;
  children: JSX.Element;
  className?: string;
}

const InputWrapper: Component<IProps> = ({ label, children, className }) => {
  return (
    <Row className={className || ""}>
      {label && <Label>{label}</Label>}
      {children}
    </Row>
  );
};

export default InputWrapper;
