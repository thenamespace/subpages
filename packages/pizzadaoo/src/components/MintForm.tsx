import {
  createNamespaceClient,
  MintTransactionParameters,
} from "namespace-sdk";
import { PlainBtn } from "./TechBtn";
import { useCallback, useState } from "react";
import { Spinner } from "./Spinner";
import { debounce } from "lodash";
import {
  useAccount,
  usePublicClient,
  useSignTypedData,
  useSwitchChain,
  useWalletClient
} from "wagmi";
import { toast } from "react-toastify";
import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { SideModal } from "./SideModal";
import { normalise } from "@ensdomains/ensjs/utils";
import pizzaChar from "../assets/PizzaCharacter.png";
import { LISTED_NAME, LISTING_CHAIN_ID } from "./Listing";
import Image from "next/image";

const namespaceClient = createNamespaceClient({
  chainId: LISTING_CHAIN_ID,
  mintSource: "pizzadao.namespace.ninja",
});

const defaultAvatar = "https://avatars.namespace.ninja/pizzadaoo.png"

const ETH_COIN = 60;
const OP_COIN = 2147492101;

enum MintSteps {
  Start = 0,
  PendingTx = 1,
  Success = 2,
}

export const MintForm = () => {
  const { openConnectModal } = useConnectModal();
  const [mintStep, setMintStep] = useState<MintSteps>(MintSteps.Start);
  const [searchLabel, setSearchLabel] = useState("");
  const [showCostModal, setShowCostModal] = useState(false);
  const { data: walletClient } = useWalletClient({ chainId: LISTING_CHAIN_ID });
  const publicClient = usePublicClient({ chainId: LISTING_CHAIN_ID });
  const { switchChain } = useSwitchChain();
  const { address, chain } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [indicator, setIndicator] = useState<{
    isChecking: boolean;
    isAvailable: boolean;
  }>({
    isChecking: false,
    isAvailable: false,
  });
  const [mintState, setMintState] = useState<{
    waitingWallet: boolean;
    waitingTx: boolean;
    txHash: string;
  }>({
    txHash: "",
    waitingTx: false,
    waitingWallet: false,
  });
  const [txHash, setTxHash] = useState()

  const handleSearch = async (value: string) => {
    const _value = value.toLocaleLowerCase();

    if (_value.includes(".")) {
      return;
    }

    try {
      normalise(_value);
    } catch (err) {
      return;
    }
    setSearchLabel(_value);

    if (_value.length > 0) {
      setIndicator({ isAvailable: false, isChecking: true });
      debouncedCheckAvailable(_value);
    }
  };

  const checkAvailable = async (value: string) => {
    const isAvailable = await namespaceClient.isSubnameAvailable(
      LISTED_NAME,
      value
    );
    setIndicator({
      isChecking: false,
      isAvailable: isAvailable,
    });
  };

  const handleMint = async () => {
    if (!walletClient || !address) {
      openConnectModal?.();
      return;
    }

    setMintState({ ...mintState, waitingWallet: true });
    let params: MintTransactionParameters;
    try {
      if (!chain || chain.id !== LISTING_CHAIN_ID) {
        switchChain({ chainId: LISTING_CHAIN_ID });
      }


      const tokens = await namespaceClient.generateAuthToken(address, signTypedDataAsync, "Verify your address")


      params = await namespaceClient.getMintTransactionParameters(LISTED_NAME, {
        minterAddress: address,
        subnameLabel: searchLabel,
        expiryInYears: 1,
        records: {
          texts: [
            {
              key: "avatar",
              value: defaultAvatar,
            },
          ],
          addresses: [
            {
              address: address,
              coinType: ETH_COIN,
            },
            {
              address: address,
              coinType: OP_COIN,
            },
          ],
        },
        subnameOwner: address,
        token: tokens.accessToken
      });
    } catch (err: any) {
      setMintState({ ...mintState, waitingWallet: false });
      if (err.details && err.details.includes) {
        const deniedErr =
          err.details.includes("User rejected the request") ||
          err.details.includes("User denied transaction signature");
        const noFundsErr = err.details.includes("insufficient funds for gas");
        if (!deniedErr && !noFundsErr) {
          toast(err.details, { className: "tech-toasty", type: "error" });
        }

        if (noFundsErr) {
          toast("Insufficient balance", {
            className: "tech-toasty",
            type: "error",
          });
        }
      } else if (err.response && err.response?.data?.message) {
        toast(err.response?.data?.message, {
          className: "tech-toasty",
          type: "error",
        });
      } else {
        let errorMsg = "Unexpected error happened :(";

        if (err.toString().includes("MINTER_NOT_TOKEN_OWNER")) {
          errorMsg = "You don't own required token";
        } else if (err.toString().includes("SUBNAME_TAKEN")) {
          errorMsg = "Subname is already taken";
        } else if (err.toString().includes("MINTER_NOT_WHITELISTED")) {
          errorMsg = "You are not whitelisted";
        } else if (err.toString().includes("LISTING_EXPIRED")) {
          errorMsg = "Listing has expired";
        } else if (err.toString().includes("SUBNAME_RESERVED")) {
          errorMsg = "Subname is reserved";
        } else if (err.toString().includes("VERIFIED_MINTER_ADDRESS_REQUIRED")) {
          errorMsg = "Verification required";
        }

        toast(errorMsg, {
          className: "tech-toasty",
          type: "error",
        });
      }
      return;
    }

    try {
      //@ts-ignore
      const tx = await walletClient.writeContract({
        address: params.contractAddress,
        value: params.value,
        function: params.functionName,
        args: params.args,
        abi: params.abi,
      });
      setMintStep(MintSteps.PendingTx);
      setTxHash(tx as any);
      setMintState({ waitingWallet: false, waitingTx: true, txHash: tx });
      setTimeout(() => {
        publicClient?.waitForTransactionReceipt({ hash: tx }).then((res) => {
          setMintStep(MintSteps.Success);
        });
      }, 8000);
    } catch (err: any) {
      setMintStep(MintSteps.Start);
      console.error(err);
      if (err.details && err.details.includes) {
        const deniedErr =
          err.details.includes("User rejected the request") ||
          err.details.includes("User denied transaction signature");
        if (!deniedErr) {
          toast(err.details, { className: "tech-toasty", type: "error" });
        }
      } else {
        toast("Unexpected error happened :(", {
          className: "tech-toasty",
          type: "error",
        });
      }
    } finally {
      setMintState({ ...mintState, waitingTx: false, waitingWallet: false });
    }
  };

  const debouncedCheckAvailable = useCallback(
    debounce((label: string) => checkAvailable(label), 300),
    []
  );

  const mintBtnDisabled =
    searchLabel.length === 0 ||
    indicator.isChecking ||
    !indicator.isAvailable ||
    mintState.waitingTx ||
    mintState.waitingWallet;
  const isTaken =
    searchLabel.length > 0 && !indicator.isChecking && !indicator.isAvailable;

  return (
    <>
      <div className="mint-form d-flex flex-column justify-content-end p-4">
        <Image src={pizzaChar} width={250} style={{marginBottom: -20, zIndex: 5}} alt="PizzaDao"></Image>
        <SideModal open={showCostModal} onClose={() => setShowCostModal(false)}>
          <div className="cost-modal">
            <p style={{ fontSize: 24 }} className="text-center">
              Subname Cost
            </p>
            <div className="d-flex price justify-content-between align-items-center w-100">
              <p>1 Characters</p>
              <p>50$</p>
            </div>
            <div className="d-flex price justify-content-between align-items-center w-100">
              <p>2 Characters</p>
              <p>20$</p>
            </div>
            <div className="d-flex price justify-content-between align-items-center w-100">
              <p>3 Characters</p>
              <p>5$</p>
            </div>
            <div className="d-flex price justify-content-between align-items-center w-100">
              <p>4+ Characters</p>
              <p>Free</p>
            </div>
          </div>
        </SideModal>
        <div className="form-tech-container">
          {mintStep === MintSteps.Start && (
            <>
              <div className="form-header mb-3">
                <h1>PizzaDAO</h1>
                <p className="subtext" style={{ color: "white" }}>
                  GET YOUR SUBNAME
                </p>
              </div>
              <div className="d-flex flex-column align-items-center">
              </div>
              <p className="text-center" style={{ fontSize: 18 }}>
                <span style={{ fontSize: 18 }} className="input-name">
                  {searchLabel.length ? searchLabel : "{name}"}.
                </span>
                {LISTED_NAME.fullName}
              </p>
              <div className="tech-input-container">
                <input
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Your name here...."
                  className="tech-input"
                  value={searchLabel}
                ></input>
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
                  <p className="err-message m-0">Already Registered</p>
                )}
              </div>
            </>
          )}
          {mintStep === MintSteps.PendingTx && (
            <TransactionPending hash={mintState.txHash || txHash as any} />
          )}
          {mintStep === MintSteps.Success && (
            <SuccessScreen
              avatar={pizzaChar.src}
              name={`${searchLabel}.${LISTED_NAME.fullName}`}
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
      <p className="mb-1">Registration succesfull</p>
      <p style={{ fontSize: 18, color: "white" }}>{name}</p>
      <div className="load-border">
        <img className="avatar" src={avatar} width={150}></img>
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
        Generating a subname
      </p>
     {hash &&  <a
        href={`https://basescan.org/tx/${hash}`}
        target="_blank"
        style={{ color: "rgb(255,255,255,0.8)", cursor: "pointer" }}
      >
        Transaction
      </a>}
    </div>
  );
};
