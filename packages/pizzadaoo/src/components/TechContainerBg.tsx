import { PlainBtn } from "./TechBtn";
import { UserProfile } from "./UserProfile";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { PropsWithChildren, useEffect, useState } from "react";
import Link from "next/link";
import opLogo from "../assets/chains/op.svg";
import Image from "next/image";
import pizzaLogo from "../assets/pizzadao-logo.png";
import pizzaChar from "../assets/PizzaCharacter.png";
import Head from "next/head";

export const TechContainerBg = (props: PropsWithChildren) => {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [imageWidth, setImageWidth] = useState(500);



  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 2000) {
        setImageWidth(900);
      } else if (window.innerWidth > 1500) {
        setImageWidth(500);
      } else {
        setImageWidth(400);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);


  

  return (
    <>
    <Head>
        <link rel="preload" href={pizzaChar.src} as="image" />
      </Head>
    <div
      className="tech-container">
        <Image className="big-char" src={pizzaChar.src} height={imageWidth} width={imageWidth} alt="adsf"></Image>
      <div className="top-nav">
        <div className="row">
          <div className="col-lg-6 col-sm-12 logo-col">
            <Link href="/" className="d-flex align-items-center">
              <Image className="me-2" alt="PizzaDao" width={220} src={pizzaLogo}></Image>
            </Link>
          </div>
          <div className="col-lg-6 col-sm-12 nav-col">
            {!isConnected ? (
              <PlainBtn
                onClick={() => openConnectModal?.()}
              >
                Connect
              </PlainBtn>
            ) : (
              <UserProfile />
            )}
          </div>
        </div>
      </div>
      <div
        className="bot-nav">
        <div className="d-flex text-center justify-content-center">
          <p
            style={{
              margin: "30px 0",
              opacity: "1",
              fontSize: 13,
              letterSpacing: "0px",
              zIndex: 99,
              position: "absolute",
              bottom: 0,
              width: "100%",
              textAlign: "center"
            }}
          >
            Created by <a style={{color:"#ffb819"}} href="https://app.namespace.ninja" target="_blank">Namespace</a>. Base Network
          </p>
        </div>
      </div>
      <div className="landing-container">{props.children}</div>
    </div>
    </>
  );
};
