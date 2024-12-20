import {
  createNamespaceClient,
  Listing,
  MintTransactionParameters,
} from "namespace-sdk";
import { PlainBtn, TechButton } from "./TechBtn";
import { optimism } from "viem/chains";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "./Spinner";
import { debounce } from "lodash";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { toast } from "react-toastify";
import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { SideModal } from "./SideModal";
import { TbAlertSquare } from "react-icons/tb";
import { normalise } from "@ensdomains/ensjs/utils";

const namespaceClient = createNamespaceClient({
  chainId: optimism.id,
  mintSource: "lsu",
});

const ETH_COIN = 60;
const OP_COIN = 2147483658;


let lastSubnameImageIndex = 0;

const getRandomSubnameImage = () => {
  lastSubnameImageIndex = (lastSubnameImageIndex + 1) % 2;
  if (lastSubnameImageIndex === 0) {
    return `https://i.imgur.com/7fYckO9.png`;
  } else {
    return `https://i.imgur.com/Dwvjn49.png`;
  }
};

const listing: Listing = {
  fullName: "lsu.eth",
  label: "lsu",
  network: "mainnet",
  node: "0x2bba4bafe44fa70e0c6b4ce37c4374fbbbf4472ad1927718948ff86597822278",
  listingType: "l2",
  registryNetwork: "optimism",
};

enum MintSteps {
  Start = 0,
  PendingTx = 1,
  Success = 2,
}

export const MintForm = () => {
  const [subnameAvatar, setSubnameAvatar] = useState<{
    generating: boolean;
    value: string;
  }>({
    generating: true,
    value: getRandomSubnameImage(),
  });
  const { openConnectModal } = useConnectModal()
  const [mintStep, setMintStep] = useState<MintSteps>(MintSteps.Start);
  const [searchLabel, setSearchLabel] = useState("");
  const [showCostModal, setShowCostModal] = useState(false);
  const { data: walletClient } = useWalletClient({ chainId: optimism.id });
  const publicClient = usePublicClient({ chainId: optimism.id });
  const { switchChain } = useSwitchChain();
  const { address, chain } = useAccount();
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

  useEffect(() => {
    generateAvatar();
  }, []);

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
      listing,
      value
    );
    setIndicator({
      isChecking: false,
      isAvailable: isAvailable,
    });
  };

  const generateAvatar = () => {
    setSubnameAvatar({ ...subnameAvatar, generating: true });
    setTimeout(() => {
      setSubnameAvatar({ value: getRandomSubnameImage(), generating: false });
    }, 800);
  };

  const handleMint = async () => {
    if (!walletClient || !address) {
      openConnectModal?.();
      return;
    }

    setMintState({ ...mintState, waitingWallet: true });
    let params: MintTransactionParameters;
    try {
      if (!chain || chain.id !== optimism.id) {
        switchChain({ chainId: optimism.id });
      }
      params = await namespaceClient.getMintTransactionParameters(
        listing,
        {
          minterAddress: address,
          subnameLabel: searchLabel,
          expiryInYears: 1,
          records: {
            texts: [
              {
                key: "avatar",
                value: subnameAvatar.value,
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
        }
      );
    } catch (err: any) {
      setMintState({ ...mintState, waitingWallet: false });
      if (err.details && err.details.includes) {
        const deniedErr =
          err.details.includes("User rejected the request") ||
          err.details.includes("User denied transaction signature");
          const noFundsErr = err.details.includes("insufficient funds for gas")
        if (!deniedErr && !noFundsErr) {
          toast(err.details, { className: "tech-toasty", type: "error"});
        }

        if (noFundsErr) {
          toast("Insufficient balance", { className: "tech-toasty", type:"error" });
        }

      } else if (err.response && err.response?.data?.message) {
        toast(err.response?.data?.message, { className: "tech-toasty", type: "error"});
      } else {
        toast("Unexpected error happened :(", { className: "tech-toasty", type: "error"})
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
      setMintState({ waitingWallet: false, waitingTx: true, txHash: tx });
      setTimeout(() => {
        publicClient?.waitForTransactionReceipt({hash:tx}).then(res => {
          setMintStep(MintSteps.Success);
        })
      }, 8000);
    } catch (err: any) {
      setMintStep(MintSteps.Start);
      console.error(err);
      if (err.details && err.details.includes) {
        const deniedErr =
          err.details.includes("User rejected the request") ||
          err.details.includes("User denied transaction signature");
        if (!deniedErr) {
          toast(err.details, { className: "tech-toasty", type: "error"});
        }
      } else {
        toast("Unexpected error happened :(", { className: "tech-toasty", type: "error"})
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
    searchLabel.length === 0 || indicator.isChecking || !indicator.isAvailable || mintState.waitingTx || mintState.waitingWallet;
  const isTaken =
    searchLabel.length > 0 && !indicator.isChecking && !indicator.isAvailable;

  return (
    <>
      <div className="mint-form d-flex flex-column justify-content-end p-4">
        <SideModal open={showCostModal} onClose={() => setShowCostModal(false)}>
          <div className="cost-modal">
            <p style={{fontSize:24}} className="text-center">Subname Cost</p>
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
        <div className="form-header mb-3">
          <h1>LSU.eth</h1>
          <p className="subtext">GET YOUR SUBNAME</p>
        </div>
        <div className="form-tech-container">
          {mintStep === MintSteps.Start && (
            <>
              <div className="d-flex flex-column align-items-center">
                <div className="cost-info d-flex align-items-center" onClick={() => setShowCostModal(true)}>
                  <TbAlertSquare className="me-1"/>
                  <div>Subname cost</div>
                </div>
                <div className="tech-avatar-cont mb-3 d-flex align-items-center justify-content-center m-auto">
                  {!subnameAvatar.generating && (
                    <img src={subnameAvatar.value} width={150} height={150}></img>
                  )}
                  {subnameAvatar.generating && <Spinner size="big" />}
                </div>
                <p
                  className={`generate-txt mb-1 ${
                    subnameAvatar.generating ? "disabled" : ""
                  }`}
                  onClick={
                    subnameAvatar.generating ? undefined : () => generateAvatar()
                  }
                >
                  Change avatar
                </p>
              </div>
              <p className="text-center" style={{fontSize: 18}}>
                <span style={{ fontSize: 18 }} className="input-name">
                  {searchLabel.length ? searchLabel : "{name}"}
                </span>
                .lsu.eth
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
            <TransactionPending hash={mintState.txHash} />
          )}
          {mintStep === MintSteps.Success && (
            <SuccessScreen
              avatar={subnameAvatar.value}
              name={`${searchLabel}.lsu.eth`}
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
      <a
        href={`https://optimistic.etherscan.io/tx/${hash}`}
        target="_blank"
        style={{ color: "rgb(255,255,255,0.8)", cursor: "pointer" }}
      >
        Transaction
      </a>
    </div>
  );
};
