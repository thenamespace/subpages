import axios from "axios";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { base, baseSepolia, mainnet, optimism, sepolia } from "viem/chains";
import { EnsListing } from "./Types";

type SupportedChain =
  | "mainnet"
  | "sepolia"
  | "base"
  | "optimism"
  | "baseSepolia";

const supportedChainIds: Record<SupportedChain, number> = {
  base: base.id,
  baseSepolia: baseSepolia.id,
  mainnet: mainnet.id,
  optimism: optimism.id,
  sepolia: sepolia.id,
};

interface IAppConfigContext {
  listedName: string;
  listingChainId: number;
  isTestnet: boolean;
  isRenting: boolean;
  listingType: "L1" | "L2";
  isError: boolean;
  isLoading: boolean;
  defaultAvatarUri?: string
}

const defaultContext: IAppConfigContext = {
  isRenting: false,
  isTestnet: false,
  listedName: "",
  listingChainId: 1,
  listingType: "L1",
  isError: false,
  isLoading: true,
};

const AppContext = createContext<IAppConfigContext>({ ...defaultContext });

export const AppContextProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<IAppConfigContext>({
    ...defaultContext,
  });

  const initialize = async () => {
    const isTestnet = import.meta.env.VITE_APP_IS_TESTNET === "true" || false;
    const listedName = import.meta.env.VITE_APP_LISTED_NAME;
    const listingChainName = import.meta.env.VITE_APP_LISTING_CHAIN;
    const defaultAvatar = import.meta.env.VITE_APP_DEFAULT_AVATAR || "https://cdn.namespace.ninja/namespace.png";

    //@ts-ignore
    if (!listingChainName || !supportedChainIds[listingChainName]) {
      setEnvError(
        `Listing chain not set in .env file. (VITE_APP_LISTING_CHAIN=mainnet). Supported chains: ${Object.keys(supportedChainIds)}`
      );
      return;
    }

    if (!listedName || listedName.length === 0) {
      setEnvError(
        "Listed name not found. Set the listed ENS name in the .env file (VITE_APP_LISTED_NAME=example.eth)"
      );
      return;
    }

    const listingNetwork = isTestnet ? "SEPOLIA" : "MAINNET";
    const backendUri = `https://${isTestnet ? "staging." : ""}list-manager.namespace.ninja/api/v1/listing/network/${listingNetwork}/name/${listedName}`;
    let listingType = "L1";

    let isExpirable = false;

    try {
      const { data } = await axios.get<EnsListing>(backendUri);
      listingType = data.type;

      if (data.l2Metadata) {
        isExpirable = data.l2Metadata.isExpirable;
      }

    } catch (err) {
      setEnvError("Failed to fetch listed name for: " + listedName);
      return;
    }

    setState({
      isError: false,
      isLoading: false,
      isRenting: isExpirable,
      isTestnet: isTestnet,
      listedName: listedName,
      listingChainId: supportedChainIds[listingChainName as SupportedChain],
      listingType: listingType as any,
      defaultAvatarUri: defaultAvatar
    });
  };

  useEffect(() => {
    initialize();
  }, []);

  const setEnvError = (message: string) => {
    toast(message, { type: "error" });
    setState({ ...state, isError: true, isLoading: false });
  };

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
};

export const useAppConfig = () => useContext(AppContext);
