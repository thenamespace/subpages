import { TechContainerBg } from "@components/components/TechContainerBg";
import { WalletConnector } from "@components/components/WalletConnect";
import "@components/styles/globals.scss";
import type { AppProps } from "next/app";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App({ Component, pageProps }: AppProps) {
  return <WalletConnector>
    <TechContainerBg>
    <Component {...pageProps} />;      
    </TechContainerBg>
    <ToastContainer/>
  </WalletConnector>
}
