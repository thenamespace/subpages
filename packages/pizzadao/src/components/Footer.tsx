import logo from "../assets/namespace.png";

export const Footer = () => {
    return <div className="ns-footer d-flex justify-content-start align-items-center">
        <div className="txt">Launch your namespace, with <a href="https://namespace.ninja" target="_blank">Namespace</a></div>
        <img className="ms-1" src={logo} width="25px"></img>
    </div>
}