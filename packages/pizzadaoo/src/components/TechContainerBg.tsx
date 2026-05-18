import { PlainBtn } from "./TechBtn";
import { UserProfile } from "./UserProfile";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { PropsWithChildren } from "react";
import Link from "next/link";
import Image from "next/image";
import pizzaLogo from "../assets/pizzadao-logo.png";
import pizzaChar from "../assets/PizzaCharacter.png";
import Head from "next/head";
import { NamespaceLogo } from "./NamespaceLogo";

export const TechContainerBg = (props: PropsWithChildren) => {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <>
    <Head>
        <link rel="preload" href={pizzaChar.src} as="image" />
      </Head>
    <div
      className="tech-container">
      <header className="top-nav">
        <Link href="/" className="top-nav__logo" aria-label="PizzaDAO home">
          <Image
            className="pizza-logo"
            alt="PizzaDAO"
            src={pizzaLogo}
            width={220}
            priority
          />
        </Link>
        <nav className="top-nav__links" aria-label="Primary">
          <Link href="/" className="top-nav__link">
            Register
          </Link>
          <Link href="/subnames" className="top-nav__link">
            My Names
          </Link>
        </nav>
        <div className="top-nav__actions">
          {!isConnected ? (
            <PlainBtn onClick={() => openConnectModal?.()}>Connect</PlainBtn>
          ) : (
            <UserProfile />
          )}
        </div>
      </header>
      <footer className="bot-nav">
        <a
          className="footer-credit"
          href="https://namespace.ninja"
          target="_blank"
          rel="noreferrer"
          aria-label="Powered by Namespace"
        >
          <span className="footer-credit__label">Powered by</span>
          <NamespaceLogo className="footer-credit__logo" />
        </a>
        <span className="footer-credit__sep" aria-hidden="true">
          ·
        </span>
        <span className="footer-credit__chain">Built on Base</span>
      </footer>
      <div className="landing-container">{props.children}</div>
    </div>
    </>
  );
};
