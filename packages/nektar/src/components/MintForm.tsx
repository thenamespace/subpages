import { useCallback, useState } from "react";
import { Button } from "./Button";
import { useNamepsaceClient, LISTEN_NAME } from "./useNamespaceClient";
import { normalize } from "viem/ens";
import { SyncLoader } from "react-spinners";
import { debounce } from "lodash";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Hash } from "viem";
import { AddressRecord } from "namespace-sdk/dist/clients";
import { base } from "viem/chains";
import { FaX } from "react-icons/fa6";
import nektarLogo from "../assets/nektar-icon.png";

enum RegistrationStep {
  START = 0,
  TX_SENT = 1,
  COMPLETE = 2,
}

const balancerFiUrl =
  "https://balancer.fi/pools/ethereum/v2/0x7cb1756e25c41eb921b2c9039f1f368f85e469950002000000000000000006e8/swap";
const defaultAvatar = "https://avatars.namespace.ninja/nektar.png";

const BASE_COIN = 2147492101;
const ETH_COIN = 60;

export const MintForm = () => {
  const [label, setLabel] = useState("");
  const { address, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const {
    checkAvailable,
    mintParameters,
    generateAuthToken,
    executeTx,
    waitForTx,
  } = useNamepsaceClient();
  const [mintError, setMintError] = useState<string>("");
  const [isNoBalanceErr, setIsNoBalanceErr] = useState(false);
  const [txHash, setTxHash] = useState<Hash>();
  const { switchChainAsync } = useSwitchChain();
  const [indicators, setIndicators] = useState<{
    checking: boolean;
    available: boolean;
  }>({
    available: false,
    checking: false,
  });
  const [mintIndicators, setMintIndicator] = useState<{
    waiting: boolean;
    btnLabel: string;
  }>({ waiting: false, btnLabel: "Register" });
  const [registrationStep, setRegistrationStep] = useState(
    RegistrationStep.START
  );

  const handleUpdateLabel = (value: string) => {
    const _value = value.toLocaleLowerCase();
    if (_value.includes(".")) {
      return;
    }
    try {
      normalize(_value);
    } catch (err) {
      return;
    }
    setLabel(_value);

    if (_value.length > 0) {
      setIndicators({ available: false, checking: true });
      debouncedCheck(_value);
    } else {
      setIndicators({ available: false, checking: false });
    }
  };

  const check = async (label: string) => {
    const subnameAvailable = await checkAvailable(label);
    setIndicators({
      available: subnameAvailable,
      checking: false,
    });
  };

  const debouncedCheck = useCallback(
    debounce((label) => check(label), 200),
    []
  );

  const handleMint = async () => {
    if (!address) {
      openConnectModal?.();
      return;
    }

    if (chainId !== base.id) {
      await switchChainAsync({ chainId: base.id });
    }

    let token;

    try {
      setMintIndicator({ btnLabel: "Waiting for wallet", waiting: true });
      token = await generateAuthToken(address);
    } catch (err) {
      return;
    } finally {
      setMintIndicator({ btnLabel: "Register", waiting: false });
    }

    const addresses: AddressRecord[] = [
      {
        address: address,
        coinType: ETH_COIN,
      },
      {
        address: address,
        coinType: BASE_COIN,
      },
    ];
    try {
      setMintIndicator({ btnLabel: "Waiting for wallet", waiting: true });
      const params = await mintParameters({
        minterAddress: address,
        subnameLabel: label,
        expiryInYears: 1,
        records: {
          addresses: addresses,
          texts: [
            {
              key: "avatar",
              value: defaultAvatar,
            },
          ],
        },
        subnameOwner: address,
        token: token.accessToken,
      });
      const tx = await executeTx(params, address);
      setTxHash(tx);
      setRegistrationStep(RegistrationStep.TX_SENT);
      setMintIndicator({ btnLabel: "Registering...", waiting: true });
      await waitForTx(tx);
      setRegistrationStep(RegistrationStep.COMPLETE);
    } catch (err: any) {
      console.error(err);
      if (err?.cause?.details?.includes("User denied transaction signatur")) {
        return;
      } else if (err?.cause?.details?.includes("insufficient funds for")) {
        setMintError(`Insufficient balance`);
      } else {
        parseError(err?.message || "");
      }
    } finally {
      setMintIndicator({ btnLabel: "Register", waiting: false });
    }
  };

  const parseError = (errMessage: string) => {
    if (errMessage.includes("MINTER_NOT_TOKEN_OWNER")) {
      setIsNoBalanceErr(true);
    } else {
      setMintError("Unknown error ocurred. Check console for more info");
    }
  };

  const noLabel = label.length === 0;
  const subnameTakenErr =
    !noLabel && !indicators.checking && !indicators.available;
  const mintBtnDisabled =
    noLabel ||
    indicators.checking ||
    !indicators.available ||
    mintIndicators.waiting;

  return (
    <div className="mint-page">
      <div className="mint-page-container d-flex align-items-center justify-content-center">
        <div
          className={`page-content-wrapper ${
            registrationStep === 2 ? "animate" : ""
          }`}
        >
          <div className="page-content d-flex flex-column">
            {registrationStep === 0 && (
              <>
                <div className="text-center">
                  <div className="avatar-placeholder mb-2 d-flex align-items-center justify-content-center">
                  <img width={100} src={nektarLogo}></img>
                  </div>
                  <p className="m-0" style={{ color: "grey" }}>
                    Register your subname
                  </p>
                  <div
                    className="mb-2"
                    style={{ fontSize: 20, color: "white", fontWeight: 500 }}
                  >
                    <span style={{ color: "rgb(101 253 235)" }}>{`${
                      label.length === 0 ? "{name}" : label
                    }.`}</span>
                    {LISTEN_NAME.fullName}
                  </div>
                </div>
                <div className="mt-2 input-cont">
                  <input
                    value={label}
                    placeholder="Find your perfect name..."
                    onChange={(e) => handleUpdateLabel(e.target.value)}
                    className="mint-input"
                  ></input>
                  {indicators.checking && (
                    <SyncLoader
                      className="input-load"
                      color="rgb(101 253 235)"
                      size={6}
                    />
                  )}
                </div>
                <Button
                  onClick={() => handleMint()}
                  className="mt-2"
                  disabled={mintBtnDisabled}
                >
                  {mintIndicators.btnLabel}
                </Button>
                {subnameTakenErr && (
                  <div className="error-msg text-center">
                    Subname is already registered
                  </div>
                )}
                {mintError.length > 0 && (
                  <div className="error-msg d-flex align-items-center justify-content-between">
                    {mintError}
                    <FaX
                      style={{ cursor: "pointer" }}
                      onClick={() => setMintError("")}
                    />
                  </div>
                )}
                {isNoBalanceErr && (
                  <div className="error-msg d-flex align-items-center justify-content-between">
                    <div>
                      Minimum balance of <a href={balancerFiUrl} target="_blank" className="uniswap-link">0.1 NET coin</a> required. 
                    </div>
                    <FaX
                      style={{ cursor: "pointer" }}
                      onClick={() => setIsNoBalanceErr(false)}
                    />
                  </div>
                )}
              </>
            )}
            {registrationStep === 1 && (
              <div className="d-flex flex-column align-items-center p-3">
                <SyncLoader
                  className="input-load mt-3 mb-3"
                  color="rgb(101 253 235)"
                  size={17}
                />
                <div className="mt-3" style={{ fontSize: 18, color: "white" }}>
                  Registration in progress
                </div>
                {txHash && (
                  <a
                    target="_blank  "
                    href={"https://basescan.org/tx/" + txHash}
                  >
                    Transaction
                  </a>
                )}
              </div>
            )}
            {registrationStep === 2 && (
              <div className="d-flex flex-column">
                <div
                  className="text-center"
                  style={{ color: "grey", fontSize: 14 }}
                >
                  You have registered
                </div>
                <div
                  style={{ color: "white", fontSize: 18 }}
                  className="mt-3 mb-3 text-center"
                >
                  <span style={{ color: "rgb(101 253 235)" }}>{label}.</span>
                  {LISTEN_NAME.fullName}
                </div>
                <div
                  className="text-center mb-3 d-flex flex-column"
                  style={{ fontSize: 14, color: "grey" }}
                >
                  <a
                    href={`https://app.ens.domains/${label}.${LISTEN_NAME.fullName}`}
                  >
                    Check on ENS
                  </a>
                </div>
                <Button
                  onClick={() => {
                    setLabel("");
                    setRegistrationStep(0);
                  }}
                >
                  Great!
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
