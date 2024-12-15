import { useAccount } from "wagmi";
import pizzaDao from "../assets/PizzaDAO-Logo-White.svg";
import { Button } from "./Button";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";

export const TopNavigation = () => {
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();

  return (
    <div className="top-navigation">
      <div className="top-navigation-cont row g-0">
      <div className="col-lg-6 logo">
        <img
          width={150}
          src={pizzaDao}
          alt="Nektar Logo"
        ></img>
      </div>
      <div className="col-lg-6 col-xs-12 profile">
        {!isConnected ? (
          <Button onClick={() => openConnectModal?.()}>Connect Wallet</Button>
        ) : (
          <ConnectButton />
        )}
      </div>
      </div>
    </div>
  );
};
