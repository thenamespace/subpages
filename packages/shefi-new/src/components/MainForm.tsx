"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { normalize } from "viem/ens";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { ENS_NAME, useNamepsaceClient } from "./useNamespaceClient";
import { debounce, set } from "lodash";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Address, Hash, namehash, parseAbi } from "viem";
import { getKnownAddress } from "./records/Addresses";
import { mainnet, sepolia } from "wagmi/chains";
import toast from "react-hot-toast";
import axios from "axios";
import { getWhitelist } from "@/api/api";

enum RegistrationStep {
  START = 0,
  TX_SENT = 1,
  PRIMARY_NAME = 2,
  COMPLETE = 3,
}

export const MintForm = () => {
  const [label, setLabel] = useState("");
  const { address, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [mintError, setMintError] = useState<string>("");
  const [txHash, setTxHash] = useState<Hash>();
  const { switchChainAsync } = useSwitchChain();
  const { checkAvailable, waitForTx } = useNamepsaceClient();

  const [indicators, setIndicators] = useState<{
    checking: boolean;
    available: boolean;
  }>({
    available: true,
    checking: false,
  });

  const [buttonText, setButtonText] = useState("Register");

  const [registrationStep, setRegistrationStep] = useState(
    RegistrationStep.START
  );
  const [whitelistConfig, setWhitelistConfig] = useState<{
    featureEnabled: boolean;
    isWhitelisted: boolean;
    isChecking: boolean;
  }>({
    featureEnabled: false,
    isWhitelisted: true,
    isChecking: true,
  });

  useEffect(() => {
    if (!address) {
      return;
    }

    getWhitelist()
      .then((res) => {
        let isWhitelisted = true;
        let featureEnabled =
          res.whitelist?.type !== undefined && res?.whitelist.type !== 0;

        if (featureEnabled) {
          const whitelisted = res.whitelist?.wallets || [];
          isWhitelisted =
            whitelisted.find(
              (i) => i.toLocaleLowerCase() === address!.toLocaleLowerCase()
            ) !== undefined;
        }

        setWhitelistConfig({
          featureEnabled: featureEnabled,
          isChecking: false,
          isWhitelisted: isWhitelisted,
        });
      })
      .catch((err) => {
        console.error(err);
        setWhitelistConfig({
          featureEnabled: false,
          isChecking: false,
          isWhitelisted: true,
        });
      });
  }, [address]);

  useEffect(() => {
    setRegistrationStep(RegistrationStep.START);
  }, []);

  const nameChainId = 8453;

  const [mintIndicators, setMintIndicator] = useState<{
    waiting: boolean;
    btnLabel: string;
  }>({ waiting: false, btnLabel: "Register" });

  let reverseRegistarAbi;
  let reverseRegistar;
  let chainForPrimaryName;
  reverseRegistar = "0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb" as Address;
  reverseRegistarAbi = parseAbi(["function setName(string name)"]);
  chainForPrimaryName = mainnet.id;

  const publicClient = usePublicClient({ chainId: chainForPrimaryName });
  const { data: walletClient } = useWalletClient({
    chainId: chainForPrimaryName,
  });

  const ETH_COIN = 60;

  let L2_COIN = null;

  const l2Address = getKnownAddress(nameChainId);

  if (l2Address) {
    L2_COIN = l2Address.coinType;
  }

  const [primaryNameIndicators, setPrimaryNameIndicators] = useState<{
    waiting: boolean;
    btnLabel: string;
  }>({ waiting: false, btnLabel: "Set primary name!" });

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
      setIndicators({ available: true, checking: false });
    }
  };

  useEffect(() => {
    if (indicators.checking && label.length > 0) {
      setButtonText(`Checking...`);
    } else if (!indicators.available) {
      setButtonText("Subname Taken");
    } else {
      setButtonText("Register");
    }
  }, [indicators]);

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

    try {
      setMintIndicator({ btnLabel: "Waiting for wallet", waiting: true });
      setButtonText("Registering...");

      const { data } = await axios.post<{ tx: Hash }>("/api/mint", {
        owner: address,
        label: label,
      });

      setTxHash(data.tx);
      setRegistrationStep(RegistrationStep.TX_SENT);
      setMintIndicator({ btnLabel: "Registering...", waiting: true });
      await waitForTx(data.tx);
      setRegistrationStep(RegistrationStep.PRIMARY_NAME);
    } catch (err: any) {
      console.error(err);
      if (err?.cause?.details?.includes("User denied transaction signature")) {
        return;
      } else if (err?.cause?.details?.includes("insufficient funds for")) {
        setMintError(`Insufficient balance`);
      } else {
        parseError(err?.message || "Unknown error ocurred");
      }
    } finally {
      setMintIndicator({ btnLabel: "Register", waiting: false });
      setButtonText("Register");
    }
  };

  const parseError = (errMessage: string) => {
    if (errMessage.includes("MINTER_NOT_TOKEN_OWNER")) {
      setMintError("You don't have enought tokens for minting!");
    } else if (errMessage.includes("SUBNAME_TAKEN")) {
      setMintError("Subname is already taken");
    } else if (errMessage.includes("MINTER_NOT_WHITELISTED")) {
      setMintError("You are not whitelisted");
    } else if (errMessage.includes("LISTING_EXPIRED")) {
      setMintError("Listing has expired");
    } else if (errMessage.includes("SUBNAME_RESERVED")) {
      setMintError("Subname is reserved");
    } else if (errMessage.includes("VERIFIED_MINTER_ADDRESS_REQUIRED")) {
      setMintError("Verification required");
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

  const handlePrimaryName = async () => {
    if (chainId !== chainForPrimaryName) {
      await switchChainAsync({ chainId: chainForPrimaryName });
    }

    try {
      setPrimaryNameIndicators({
        btnLabel: "Waiting for wallet",
        waiting: true,
      });

      const resp = await publicClient!!.simulateContract({
        abi: reverseRegistarAbi,
        address: reverseRegistar,
        functionName: "setName",
        args: [`${label}.${ENS_NAME}`],
        account: address!!,
      });

      try {
        const tx = await walletClient!!.writeContract(resp.request);
        setPrimaryNameIndicators({ btnLabel: "Processing...", waiting: true });

        await publicClient?.waitForTransactionReceipt({
          hash: tx,
          confirmations: 1,
        });
        setRegistrationStep(RegistrationStep.COMPLETE);

        toast.success("Primary name set successfully!");
      } catch (err: any) {
        if (err.details) {
          toast.error(err.details);
        }
      }
    } catch (err: any) {
      if (err.details) {
        toast.error(err.details);
      } else if (err.response) {
        toast.error(err.response?.data?.message);
      } else {
        console.log(err);
        toast.error("Unknown error occurred :(");
      }
    } finally {
      setPrimaryNameIndicators({
        btnLabel: "Set primary name!",
        waiting: false,
      });
    }
  };

  const showNotWhitelistedBtn =
    !whitelistConfig.isChecking &&
    whitelistConfig.featureEnabled &&
    !whitelistConfig.isWhitelisted;

  return (
    <div className={"flex w-full max-w-80 flex-col gap-2"}>
      {registrationStep != RegistrationStep.COMPLETE &&
        registrationStep != RegistrationStep.PRIMARY_NAME && (
          <>
            <Input
              name="name"
              placeholder="Enter your name"
              suffix={`.shefi.eth`}
              onChange={(e) => handleUpdateLabel(e.target.value)}
            />

            {!showNotWhitelistedBtn && (
              <Button
                loading={indicators.checking}
                disabled={mintBtnDisabled}
                className={`${!indicators.available ? "bg-red-400 hover:bg-red-500" : ""} disabled:bg-gray-300`}
                onClick={(e) => {
                  e.preventDefault();
                  handleMint();
                }}
              >
                {buttonText}
              </Button>
            )}
            {showNotWhitelistedBtn && (
              <Button disabled={true} className={`disabled:bg-gray-300`}>
                Not whitelisted
              </Button>
            )}
          </>
        )}
      {registrationStep === RegistrationStep.PRIMARY_NAME && (
        <>
          <h1 className="text-lg font-bold">
            You can set {label}.shefi.eth as your primary name!
          </h1>
          <Button
            disabled={primaryNameIndicators.waiting}
            loading={primaryNameIndicators.waiting}
            onClick={() => {
              handlePrimaryName();
            }}
          >
            {primaryNameIndicators.btnLabel}
          </Button>
          <Button
            onClick={() => {
              setLabel("");
              setRegistrationStep(RegistrationStep.START);
            }}
          >
            Skip
          </Button>
        </>
      )}
      {registrationStep === RegistrationStep.COMPLETE && (
        <>
          <h1 className="text-lg font-bold">
            You have successfully registred {label}.shefi.eth
          </h1>
          <Button
            onClick={() => {
              setLabel("");
              setRegistrationStep(RegistrationStep.START);
            }}
          >
            Done!
          </Button>
        </>
      )}
    </div>
  );
};
