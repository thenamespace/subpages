import { PlainBtn } from "./TechBtn";
import { useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "./Spinner";
import {
  useAccount,
  usePublicClient,
  useSignTypedData,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { toast } from "react-toastify";
import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { normalise } from "@ensdomains/ensjs/utils";
import pizzaChar from "../assets/PizzaCharacter.png";
import { LISTED_NAMES, Listing, LISTING_CHAIN_ID } from "./Listing";
import Image from "next/image";
import {
  ChainName,
  createMintClient,
  MintTransactionResponse,
} from "@namespacesdk/mint-manager";
import { debounce } from "../utils/debounce";
import { getTxErrorMessage, isUserRejection } from "../utils/txError";

// Lazily created so the SDK is not initialised (and does not log) at module
// import time during SSR/build.
let mintClientSingleton: ReturnType<typeof createMintClient> | undefined;
const getMintClient = () =>
  (mintClientSingleton ??= createMintClient({ mintSource: "pizzadao" }));

const defaultAvatar = "https://avatars.namespace.ninja/pizzadaoo.png";

enum MintSteps {
  Start = 0,
  PendingTx = 1,
  Success = 2,
}

interface Indicator {
  isChecking: boolean;
  isAvailable: boolean;
  isError?: boolean;
}

interface MintState {
  waitingWallet: boolean;
  waitingTx: boolean;
  txHash: string;
}

export const MintForm = () => {
  const { openConnectModal } = useConnectModal();
  const [mintStep, setMintStep] = useState<MintSteps>(MintSteps.Start);
  const [searchLabel, setSearchLabel] = useState("");
  const { data: walletClient } = useWalletClient({ chainId: LISTING_CHAIN_ID });
  const publicClient = usePublicClient({ chainId: LISTING_CHAIN_ID });
  const [selectedPizzaName, setSelectedPizza] = useState<Listing>(
    LISTED_NAMES[0],
  );
  const { switchChainAsync } = useSwitchChain();
  const { address, chain } = useAccount();
  useSignTypedData();
  const [indicator, setIndicator] = useState<Indicator>({
    isChecking: false,
    isAvailable: false,
    isError: false,
  });
  const [mintState, setMintState] = useState<MintState>({
    txHash: "",
    waitingTx: false,
    waitingWallet: false,
  });
  const [mintedName, setMintedName] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkAvailable = async (value: string) => {
    try {
      const fullName = `${value}.${selectedPizzaName.fullName}`;
      const isAvailable = await getMintClient().isL2SubnameAvailable(
        fullName,
        LISTING_CHAIN_ID,
      );
      setIndicator({ isChecking: false, isAvailable });
    } catch (err: unknown) {
      setIndicator({ isChecking: false, isAvailable: true, isError: true });
      toast(
        getTxErrorMessage(
          err,
          "Error while checking subname, is the name listed?",
        ) ?? "Error while checking subname, is the name listed?",
        { className: "tech-toasty", type: "error" },
      );
    }
  };

  const debouncedCheckAvailable = useMemo(
    () =>
      debounce((label: string) => {
        void checkAvailable(label);
      }, 300),
    // Recreated when the parent name changes so availability is checked
    // against the currently selected listing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPizzaName],
  );

  useEffect(
    () => () => debouncedCheckAvailable.cancel(),
    [debouncedCheckAvailable],
  );

  const handleSearch = (value: string) => {
    const _value = value.toLocaleLowerCase();

    if (_value.includes(".")) {
      return;
    }

    try {
      normalise(_value);
    } catch {
      return;
    }
    setSearchLabel(_value);

    if (_value.length > 0) {
      setIndicator({ isAvailable: false, isChecking: true, isError: false });
      debouncedCheckAvailable(_value);
    }
  };

  const handleMint = async () => {
    if (!walletClient || !address || !publicClient) {
      openConnectModal?.();
      return;
    }

    // Check chain first before proceeding
    if (!chain || chain.id !== LISTING_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: LISTING_CHAIN_ID });
      } catch (error: unknown) {
        if (isUserRejection(error)) {
          return;
        }
        toast("Please switch to Base network to register", {
          className: "tech-toasty",
          type: "error",
        });
        return;
      }
    }

    setMintState((prev) => ({ ...prev, waitingWallet: true }));
    // Freeze the name being minted so that changing the selected domain
    // while the transaction is pending doesn't change the success screen label.
    const currentMintedName = `${searchLabel}.${selectedPizzaName.fullName}`;
    setMintedName(currentMintedName);

    let request: Parameters<typeof walletClient.writeContract>[0];
    try {
      const params: MintTransactionResponse =
        await getMintClient().getMintTransactionParameters({
          parentName: selectedPizzaName.fullName,
          minterAddress: address,
          label: searchLabel,
          expiryInYears: 1,
          records: {
            texts: [{ key: "avatar", value: defaultAvatar }],
            addresses: [
              { value: address, chain: ChainName.Ethereum },
              { value: address, chain: ChainName.Base },
            ],
          },
          owner: address,
        });

      const simulation = await publicClient.simulateContract({
        abi: params.abi,
        address: params.contractAddress,
        functionName: params.functionName,
        args: params.args,
        account: address,
        value: params.value,
      });
      request = simulation.request as typeof request;
    } catch (err: unknown) {
      setMintState((prev) => ({ ...prev, waitingWallet: false }));
      const message = getTxErrorMessage(err);
      if (message) {
        toast(message, { className: "tech-toasty", type: "error" });
      }
      return;
    }

    try {
      const tx = await walletClient.writeContract(request);
      setMintStep(MintSteps.PendingTx);
      setMintState({ waitingWallet: false, waitingTx: true, txHash: tx });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      if (mountedRef.current) {
        setMintStep(MintSteps.Success);
      }
    } catch (err: unknown) {
      console.error(err);
      setMintStep(MintSteps.Start);
      const message = getTxErrorMessage(err);
      if (message) {
        toast(message, { className: "tech-toasty", type: "error" });
      }
    } finally {
      setMintState((prev) => ({
        ...prev,
        waitingTx: false,
        waitingWallet: false,
      }));
    }
  };

  const handleSelectName = (listing: Listing) => {
    setSearchLabel("");
    setSelectedPizza(listing);
  };

  const getInstructionText = (domainName: string) => {
    switch (domainName) {
      case "pizzadao.eth":
        return "Ask a Capo or DPR to mint your crew number for you.";
      case "pizzamafia.eth":
        return "Anyone with a Rare Pizza Box NFT can mint a pizza mafia name.";
      case "rarepizzas.eth":
        return "Ask a Capo or DPR to mint your topping for you.";
      default:
        return "";
    }
  };

  const isWrongChain = chain && chain.id !== LISTING_CHAIN_ID;
  const mintBtnDisabled =
    searchLabel.length === 0 ||
    indicator.isChecking ||
    !indicator.isAvailable ||
    mintState.waitingTx ||
    mintState.waitingWallet ||
    indicator.isError ||
    isWrongChain;
  const isTaken =
    searchLabel.length > 0 && !indicator.isChecking && !indicator.isAvailable;

  return (
    <>
      <div className="mint-form d-flex flex-column justify-content-end p-4">
        <Image src={pizzaChar} className="pizza-mascot" alt="PizzaDao" />
        <div className="form-tech-container">
          {mintStep === MintSteps.Start && (
            <>
              <div className="form-header mb-2">
                <h1>PizzaDAO</h1>
                <p className="subtext" style={{ color: "white" }}>
                  GET YOUR SUBNAME
                </p>
                <div className="select-name-cont d-flex flex-wrap justify-content-center">
                  {LISTED_NAMES.map((name) => (
                    <button
                      type="button"
                      onClick={() => handleSelectName(name)}
                      className={`select-name-badge ${
                        name.node === selectedPizzaName.node ? "active" : ""
                      }`}
                      key={name.node}
                    >
                      {name.fullName}
                    </button>
                  ))}
                </div>
              </div>
              <div className="d-flex flex-column align-items-center"></div>
              <div className="instruction-text-container mb-3">
                <p
                  className="instruction-text text-center"
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: "14px",
                    margin: "0 auto",
                    maxWidth: "300px",
                    lineHeight: "1.4",
                  }}
                >
                  {getInstructionText(selectedPizzaName.fullName)}
                </p>
              </div>
              <p className="text-center" style={{ fontSize: 18 }}>
                <span style={{ fontSize: 18 }} className="input-name">
                  {searchLabel.length ? searchLabel : "{name}"}.
                </span>
                {selectedPizzaName.fullName}
              </p>
              <div className="tech-input-container">
                <input
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Your name here...."
                  className="tech-input"
                  value={searchLabel}
                />
                <div className="loader-cont">
                  {indicator.isChecking && <Spinner />}
                </div>
              </div>
              <div>
                <PlainBtn
                  disabled={mintBtnDisabled}
                  text={"register"}
                  className="mt-2 w-100"
                  onClick={() => handleMint()}
                >
                  Register
                </PlainBtn>
              </div>
              <div className="err-container mt-2">
                {isTaken && (
                  <p className="err-message m-0">
                    You don&apos;t have minting permissions
                  </p>
                )}
                {isWrongChain && address && (
                  <p className="err-message m-0" style={{ color: "#ff6b6b" }}>
                    Please switch to Base network to register
                  </p>
                )}
              </div>
            </>
          )}
          {mintStep === MintSteps.PendingTx && (
            <TransactionPending hash={mintState.txHash} />
          )}
          {mintStep === MintSteps.Success && (
            <SuccessScreen
              avatar={pizzaChar.src}
              name={
                mintedName || `${searchLabel}.${selectedPizzaName.fullName}`
              }
            />
          )}
        </div>
      </div>
    </>
  );
};

export const SuccessScreen = ({
  avatar,
  name,
}: {
  avatar: string;
  name: string;
}) => {
  return (
    <div className="d-flex flex-column align-items-center success-screen">
      <p className="mb-1">Registration successful</p>
      <p style={{ fontSize: 18, color: "white" }}>{name}</p>
      <div className="load-border">
        <img className="avatar" src={avatar} width={150} alt={name} />
      </div>
      <Link
        className="mt-3"
        href={{ pathname: "/subnames", query: { selected: name } }}
      >
        <PlainBtn>Confirm</PlainBtn>
      </Link>
    </div>
  );
};

export const TransactionPending = ({ hash }: { hash: string }) => {
  return (
    <div
      className="d-flex flex-column align-items-center"
      style={{ height: 200 }}
    >
      <Spinner size="big" />
      <p className="mt-3 mb-0" style={{ fontSize: "22px" }}>
        Baking your name
      </p>
      {hash && (
        <a
          href={`https://basescan.org/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "white", cursor: "pointer" }}
        >
          Transaction
        </a>
      )}
    </div>
  );
};
