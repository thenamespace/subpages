import { createPortal } from "react-dom"

export const SideModal = () => {

    return createPortal(<div className="side-modal-container">

    </div>, document.body)
}