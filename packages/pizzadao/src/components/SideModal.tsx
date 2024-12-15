import { PropsWithChildren } from "react"
import { createPortal } from "react-dom"

export const SideModal = ({children}: PropsWithChildren) => {

    return createPortal(<div className="side-modal-container">
        <div className="side-modal-content">{children}</div>
    </div>, document.body)
}