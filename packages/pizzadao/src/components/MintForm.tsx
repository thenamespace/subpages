import { useCallback, useEffect, useState } from "react";
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
import { PageContainer } from "./PageContainer";
import { getChain } from "namespace-sdk";
import { shortedString } from "./Utils";

enum RegistrationStep {
  START = 0,
  TX_SENT = 1,
  COMPLETE = 2,
}

const defaultAvatar = "https://avatars.namespace.ninja/pizzadao.png";

const BASE_COIN = 2147492101;
const ETH_COIN = 60;

export const MintForm = () => {
  const listingChainId =
    getChain(LISTEN_NAME.registryNetwork || LISTEN_NAME.network).id || base.id;
  const [label, setLabel] = useState("");
  const { address, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const {
    checkAvailable,
    mintParameters,
    generateAuthToken,
    executeTx,
    waitForTx,
    simulateMint
  } = useNamepsaceClient();
  const [mintError, setMintError] = useState<string>("");
  const [isNoBalanceErr, setIsNoBalanceErr] = useState(false);
  const [requiresVerifiedMinter, setRequiresVerifiedMinter] = useState(false);
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

  useEffect(() => {
    
    if (address) {
      simulateMint(Math.random().toString(), address).then(res => {
        if (res.requiresVerifiedMinter) {
          setRequiresVerifiedMinter(true);
        }
      })
    }

  },[address])

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

    if (chainId !== listingChainId) {
      await switchChainAsync({ chainId: listingChainId });
    }

    let token;
    if (requiresVerifiedMinter) {
      try {
        setMintIndicator({ btnLabel: "Waiting for wallet", waiting: true });
        token = (await generateAuthToken(address)).accessToken;
      } catch (err) {
        return;
      } finally {
        setMintIndicator({ btnLabel: "Register", waiting: false });
      }
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
        token
      });

      const tx = await executeTx(params, address);
      setTxHash(tx);
      console.log(tx, "TX HASH HERE!!");
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

  if (true) {
    return (
      <PageContainer>
        <div className="mint-form-container">
          <div className="content-container g-0 text-center p-4">
            {registrationStep === 0 && (
              <>
                <div className="tw small-txt">REGISTER YOUR SUBNAME</div>
                <div style={{ fontSize: 28 }} className="tw mb-2">
                  <span className="tg">
                    {label.length === 0 ? `{name}` : shortedString(label, 14)}
                  </span>
                  {`.${LISTEN_NAME.fullName}`}
                </div>
                <div className="input-container">
                  <input
                    placeholder="Type your subname..."
                    value={label}
                    onChange={(e) => handleUpdateLabel(e.target.value)}
                    className="w-100 search-input"
                  ></input>
                  {indicators.checking && (
                    <SyncLoader
                      color="#0B8766"
                      size={6}
                      className="input-loader"
                    />
                  )}
                </div>
                <Button
                  className="w-100 mt-2"
                  onClick={() => handleMint()}
                  disabled={mintBtnDisabled}
                >
                  {mintIndicators.btnLabel}
                </Button>
                {subnameTakenErr && (
                  <div className="error-msg text-center tw mt-2">
                    Subname is already registered
                  </div>
                )}
              </>
            )}
            {registrationStep === RegistrationStep.TX_SENT && (
              <>
                <SyncLoader color="#0B8766" size={30} />
                <div className="tw mt-3" style={{ fontSize: 24 }}>
                  Registering name....
                </div>
                {txHash && (
                  <a target="_blank" href={`https://basescan.org/tx/${txHash}`}>
                    <div className="tg" style={{ textDecoration: "underline" }}>
                      Transaction
                    </div>
                  </a>
                )}
                <Button
                  className="w-100 mt-2"
                  onClick={() => handleMint()}
                  disabled={mintBtnDisabled}
                >
                  {mintIndicators.btnLabel}
                </Button>
              </>
            )}
            {registrationStep === RegistrationStep.COMPLETE && (
              <>
                <div className="tw small-txt">REGISTRATION SUCCESS</div>
                <div style={{ fontSize: 28 }} className="tw mb-2">
                  <span className="tg">
                    {label.length === 0 ? `{name}` : label}
                  </span>
                  {`.${LISTEN_NAME.fullName}`}
                </div>
                <a
                  style={{ color: "white", textDecoration: "underline" }}
                  className="tw"
                  target="_blank"
                  href={`https://app.ens.domains/${label}.${LISTEN_NAME.fullName}`}
                >
                  Check on ENS
                </a>
                <Button
                  className="w-100 mt-2"
                  onClick={() => {
                    handleUpdateLabel("");
                    setRegistrationStep(RegistrationStep.START);
                  }}
                >
                  Great!
                </Button>
              </>
            )}
          </div>
        </div>
      </PageContainer>
    );
  }
}
