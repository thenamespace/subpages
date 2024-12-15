import { HtmlHTMLAttributes, PropsWithChildren } from "react";

interface ButtonProps
  extends PropsWithChildren,
    HtmlHTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
}

export const Button = (props: ButtonProps) => {
  return (
    <button
      {...props}
      className={`nektar-btn ${props.disabled ? "disabled" : ""} ${props.className || ""}`}
    >
      {props.children}
    </button>
  );
};
