import { ReactElement, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PlainBtn } from "./TechBtn";

export const SideModal = (props: {
  open: boolean;
  onClose?: () => void;
  children?: ReactElement;
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!props.open) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        props.onClose?.();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [props.open, props.onClose]);

  if (!isClient || !props.open) {
    return null; // Render nothing on the server side
  }

  return createPortal(
    <div className="side-modal-cont" role="dialog" aria-modal="true">
      <div
        className="backdrop"
        onClick={() => props.onClose?.()}
        aria-hidden="true"
      />
      <div className="side-modal">
        <div className="btn-container">
          <PlainBtn onClick={() => props.onClose?.()}>Close</PlainBtn>
        </div>
        <div className="modal-content">{props.children}</div>
      </div>
    </div>,
    document.body, // This will only run on the client side
  );
};
