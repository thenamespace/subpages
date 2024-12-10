import logo from "../assets/namespace.png";

export const Footer = () => {
    return <div className="ns-footer d-flex justify-content-start align-items-center">
        <img className="me-1" src={logo} width="25px"></img>
        <div className="txt">Powered by <a href="https://namespace.ninja" target="_blank">Namespace</a></div>
    </div>
}