import { useCallback, useState } from "react";
import { Button } from "./Button";
import { useNamepsaceClient, LISTEN_NAME } from "./useNamespaceClient";
import { normalize } from "viem/ens";
import { SyncLoader } from "react-spinners";
import { add, debounce } from "lodash";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

export const MintForm = () => {
  const [label, setLabel] = useState("");
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { checkAvailable } = useNamepsaceClient();
  const [indicators, setIndicators] = useState<{
    checking: boolean;
    available: boolean;
  }>({
    available: false,
    checking: false,
  });

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

  const handleMint = () => {
    if (!address) {
      openConnectModal?.();
      return;
    }

    try {
    } catch (err) {

    }
  };

  const noLabel = label.length === 0;
  const subnameTakenErr =
    !noLabel && !indicators.checking && !indicators.available;
  const mintBtnDisabled =
    noLabel || indicators.checking || !indicators.available;

  return (
    <div className="mint-page">
      <div className="mint-page-container d-flex align-items-center justify-content-center">
        <div className="page-content d-flex flex-column">
          <div className="text-center">
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
            Register
          </Button>
          <div className="mt-2 text-center text-white">
            Set Profile
          </div>
          {subnameTakenErr && (
            <div className="error-msg text-center">
              Subname is already registered
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
