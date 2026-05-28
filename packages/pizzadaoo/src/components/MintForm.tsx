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
import { LISTED_NAMES, Listing, LISTING_CHAIN_ID, SWAP_PARENT_NAME } from "./Listing";
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

type AvailabilityStatus =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

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
  const [availability, setAvailability] = useState<AvailabilityStatus>("idle");
  const [mintState, setMintState] = useState<MintState>({
    txHash: "",
    waitingTx: false,
    waitingWallet: false,
  });
  const [mintedName, setMintedName] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

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
      setAvailability(isAvailable ? "available" : "unavailable");
    } catch (err: unknown) {
      setAvailability("error");
      toast(
        getTxErrorMessage(
          err,
          "Couldn't check that name — try again.",
        ) ?? "Couldn't check that name — try again.",
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
    setMintError(null);

    if (_value.length > 0) {
      setAvailability("checking");
      debouncedCheckAvailable(_value);
    } else {
      setAvailability("idle");
    }
  };

  const handleMint = async () => {
    if (!walletClient || !address || !publicClient) {
      openConnectModal?.();
      return;
    }

    setMintError(null);

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
        setMintError(message);
      }
      return;
    }

    try {
      const tx = await walletClient.writeContract(request);
      setMintStep(MintSteps.PendingTx);
      setMintState({ waitingWallet: false, waitingTx: true, txHash: tx });

      // waitForTransactionReceipt resolves for reverted txs too, so the
      // status MUST be checked — otherwise a failed mint still shows
      // "Registration successful".
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
        confirmations: 2,
      });
      if (!mountedRef.current) {
        return;
      }
      if (receipt.status === "success") {
        setMintStep(MintSteps.Success);
      } else {
        setMintStep(MintSteps.Start);
        setMintError(
          "The transaction was reverted on-chain — your name was not registered.",
        );
      }
    } catch (err: unknown) {
      console.error(err);
      setMintStep(MintSteps.Start);
      const message = getTxErrorMessage(err);
      if (message) {
        setMintError(message);
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
    setAvailability("idle");
    setMintError(null);
    setSelectedPizza(listing);
  };

  const resetFlow = () => {
    setMintStep(MintSteps.Start);
    setSearchLabel("");
    setAvailability("idle");
    setMintError(null);
    setMintedName(null);
    setMintState({ txHash: "", waitingTx: false, waitingWallet: false });
  };

  const getInstructionText = (domainName: string) => {
    switch (domainName) {
      case "pizzadao.eth":
        return "Ask a Capo or DPR to mint your crew number for you.";
      case "pizzamafia.eth":
        return "Anyone with a Rare Pizza Box NFT can mint a pizza mafia name.";
      case "rarepizzas.eth":
        return "Ask a Capo or DPR to mint your topping for you.";
      case SWAP_PARENT_NAME:
        return "Already have one? Visit My Subnames to rename it for free.";
      default:
        return "";
    }
  };

  const handleSwitchChain = async () => {
    try {
      await switchChainAsync({ chainId: LISTING_CHAIN_ID });
    } catch (err: unknown) {
      if (!isUserRejection(err)) {
        toast("Could not switch network. Try switching in your wallet.", {
          className: "tech-toasty",
          type: "error",
        });
      }
    }
  };

  const isWrongChain = Boolean(chain) && chain?.id !== LISTING_CHAIN_ID;
  const needsChainSwitch = Boolean(address) && isWrongChain;
  const isBusy = mintState.waitingWallet || mintState.waitingTx;
  const fullName = `${searchLabel}.${selectedPizzaName.fullName}`;
  const mintBtnDisabled =
    searchLabel.length === 0 ||
    availability !== "available" ||
    isBusy;

  const registerLabel = mintState.waitingWallet
    ? "Confirm in wallet…"
    : "Register";

  return (
    <>
      <div className="mint-form d-flex flex-column justify-content-end p-4">
        <Image src={pizzaChar} className="pizza-mascot" alt="PizzaDao" />
        <div className="form-tech-container">
          {mintStep === MintSteps.Start && mintState.waitingWallet && (
            <WalletConfirmation fullName={fullName} />
          )}
          {mintStep === MintSteps.Start && !mintState.waitingWallet && (
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
                      disabled={isBusy}
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
              <div className="instruction-text-container mb-3">
                <p className="instruction-text text-center">
                  {getInstructionText(selectedPizzaName.fullName)}
                </p>
              </div>
              <p className="text-center name-preview">
                <span className="input-name">
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
                  disabled={isBusy}
                  aria-label="Subname to register"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <div className="loader-cont">
                  {availability === "checking" && <Spinner />}
                </div>
              </div>

              <AvailabilityHint
                status={availability}
                hasInput={searchLabel.length > 0}
                fullName={fullName}
              />

              <div className="mt-2">
                {needsChainSwitch ? (
                  <PlainBtn
                    className="w-100"
                    onClick={() => handleSwitchChain()}
                  >
                    Switch to Base Network
                  </PlainBtn>
                ) : (
                  <PlainBtn
                    disabled={mintBtnDisabled}
                    loading={isBusy}
                    className="w-100"
                    onClick={() => handleMint()}
                  >
                    {registerLabel}
                  </PlainBtn>
                )}
              </div>

              {mintError && (
                <div className="mint-error" role="alert">
                  <p className="mint-error__msg">{mintError}</p>
                  <button
                    type="button"
                    className="mint-error__retry"
                    onClick={() => {
                      setMintError(null);
                      void handleMint();
                    }}
                  >
                    Try again
                  </button>
                </div>
              )}
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
              onRegisterAnother={resetFlow}
            />
          )}
        </div>
      </div>
    </>
  );
};

const AvailabilityHint = ({
  status,
  hasInput,
  fullName,
}: {
  status: AvailabilityStatus;
  hasInput: boolean;
  fullName: string;
}) => {
  // Reserve the row height so the layout never shifts as state changes.
  let content: React.ReactNode = " ";
  let tone = "";

  if (!hasInput) {
    content = "Type a name to check availability";
    tone = "is-idle";
  } else if (status === "checking") {
    content = "Checking availability…";
    tone = "is-checking";
  } else if (status === "available") {
    content = (
      <>
        <span className="avail-dot" aria-hidden="true" />
        {fullName} is available
      </>
    );
    tone = "is-available";
  } else if (status === "unavailable") {
    content = (
      <>
        <span className="avail-dot" aria-hidden="true" />
        That name isn&apos;t available
      </>
    );
    tone = "is-unavailable";
  } else if (status === "error") {
    content = "Couldn't check — try a different name";
    tone = "is-error";
  }

  return (
    <p className={`availability ${tone}`} aria-live="polite">
      {content}
    </p>
  );
};

export const SuccessScreen = ({
  avatar,
  name,
  onRegisterAnother,
}: {
  avatar: string;
  name: string;
  onRegisterAnother?: () => void;
}) => {
  return (
    <div className="d-flex flex-column align-items-center success-screen">
      <div className="success-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path
            d="M5 13l4 4L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="success-title mb-1">Registration successful</p>
      <p className="success-name">{name}</p>
      <div className="load-border">
        <img className="avatar" src={avatar} width={150} alt={name} />
      </div>
      <div className="success-actions mt-3">
        <Link href={{ pathname: "/subnames", query: { selected: name } }}>
          <PlainBtn>View name</PlainBtn>
        </Link>
        {onRegisterAnother && (
          <button
            type="button"
            className="success-secondary"
            onClick={onRegisterAnother}
          >
            Register another
          </button>
        )}
      </div>
    </div>
  );
};

const WalletConfirmation = ({ fullName }: { fullName: string }) => {
  return (
    <div
      className="tx-pending d-flex flex-column align-items-center"
      role="status"
      aria-live="polite"
    >
      <Spinner size="big" />
      <p className="tx-pending__title">Confirm in your wallet</p>
      <p className="tx-pending__sub">
        Approve the registration of <strong>{fullName}</strong>.
      </p>
    </div>
  );
};

export const TransactionPending = ({ hash }: { hash: string }) => {
  return (
    <div className="tx-pending d-flex flex-column align-items-center">
      <Spinner size="big" />
      <p className="tx-pending__title">Baking your name</p>
      <p className="tx-pending__sub">
        This usually takes a few seconds. Keep this tab open.
      </p>
      <ol className="tx-steps" aria-label="Transaction progress">
        <li className="is-done">
          <span className="tx-steps__dot" aria-hidden="true" />
          Transaction submitted
        </li>
        <li className="is-active">
          <span className="tx-steps__dot" aria-hidden="true" />
          Confirming on Base
        </li>
      </ol>
      {hash && (
        <a
          className="tx-pending__link"
          href={`https://basescan.org/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          View on BaseScan ↗
        </a>
      )}
    </div>
  );
};
