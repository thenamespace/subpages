import { useEffect, useMemo, useRef, useState } from "react";
import { Subname } from "./Models";
import { KnownAddresses, WalletAddress } from "./records/Addresses";
import { getCoderByCoinType } from "@ensdomains/address-encoder";
import {
  encodeFunctionData,
  Hash,
  Hex,
  isAddress,
  namehash,
  parseAbi,
  toHex,
  hexToBytes,
} from "viem";
import { PlainBtn } from "./TechBtn";
import chainIcon from "../assets/chains/circle.svg";
import { KnownText, KnownTexts } from "./records/TextRecords";
import { CgProfile } from "react-icons/cg";
import { IoShareSocialSharp } from "react-icons/io5";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { validate as isValidBtcAddress } from "bitcoin-address-validation";
import { toast } from "react-toastify";
import { LISTING_CHAIN_ID, SWAP_PARENT_NAME } from "./Listing";
import { getL2NamespaceContracts } from "@namespacesdk/addresses";
import { getTxErrorMessage } from "../utils/txError";
import { SwapModal } from "./SwapModal";

const FALLBACK_AVATAR = "https://avatars.namespace.ninja/pizzadaoo.png";

const resolverAbi = parseAbi([
  "function setText(bytes32 node, string key, string value) external",
  "function setAddr(bytes32 node, uint256 coinType, bytes value) external",
]);
const opResolver = getL2NamespaceContracts(LISTING_CHAIN_ID).resolver

export const SingleSubname = ({
  subname,
  onUpdate,
  alreadySwapped = false,
}: {
  subname: Subname;
  // Called after a record update (no arg) or a rename (the new full name,
  // so the parent can poll the indexer for it).
  onUpdate: (renamedTo?: string) => void;
  alreadySwapped?: boolean;
}) => {
  const publicClient = usePublicClient({ chainId: LISTING_CHAIN_ID });
  const { data: walletClient } = useWalletClient({ chainId: LISTING_CHAIN_ID });
  const { switchChainAsync } = useSwitchChain();
  const { chain, address } = useAccount();

  const [selectedCoin, setSelectedCoin] = useState(60);
  const [selectedText, setSelectedText] = useState("name");
  const [addresseValues, setAddressValues] = useState<Record<number, string>>(
    {}
  );

  const [btnState, setBtnState] = useState<{
    waitingWallet: boolean
    waitingTx: boolean
  }>({
    waitingTx: false,
    waitingWallet: false
  })

  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [currentNav, setCurrentNav] = useState<"text" | "addr">("addr");

  const [swapping, setSwapping] = useState(false);
  const [swappedTo, setSwappedTo] = useState<string | null>(null);

  // Offer the rename only for names under the swap parent, and only if the
  // wallet hasn't already spent its one sponsored swap (or just did, in this
  // session). `alreadySwapped` is also true for the swap-result name itself.
  const canSwap =
    subname.name.endsWith(`.${SWAP_PARENT_NAME}`) &&
    !swappedTo &&
    !alreadySwapped;
  // Avatar src lives in state so onError can fall back to a known-good
  // URL — the raw value is attacker-controllable (any subname owner can
  // set their `avatar` text record to an arbitrary URL).
  const [avatarSrc, setAvatarSrc] = useState<string>(
    subname.texts?.["avatar"] || FALLBACK_AVATAR,
  );
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // Guards state updates that arrive after the SideModal closes —
  // closing mid-tx must not setBtnState or refresh the parent list.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isSelected = (coin: number) => {
    return selectedCoin === coin;
  };

  useEffect(() => {
    const _texts: Record<string, string> = {};
    const _addresses: Record<number, string> = {};

    Object.keys(subname.addresses || {}).forEach((coinType) => {
      const _coin = parseInt(coinType);
      const coder = getCoderByCoinType(_coin);
      if (coder) {
        _addresses[parseInt(coinType)] = coder.encode(
          hexToBytes(subname.addresses[coinType] as Hex)
        );
      }
    });
    Object.keys(subname.texts || {}).forEach((textKey) => {
      _texts[textKey] = subname.texts[textKey];
    });

    setAddressValues(_addresses);
    setTextValues(_texts);
    setAvatarSrc(subname.texts?.["avatar"] || FALLBACK_AVATAR);
  }, [subname]);

  const addressMetadata: WalletAddress = useMemo(() => {
    return (
      KnownAddresses[selectedCoin] || {
        coinType: -1,
        icon: chainIcon.src,
        label: "unk",
        name: "Unknown",
      }
    );
  }, [selectedCoin]);

  const textMetadata: KnownText = useMemo(() => {
    const defaultt: KnownText = {
      key: "",
      label: "",
      type: "profile",
      disabled: false,
      placeholder: "set text value...",
    };

    if (!selectedText || !KnownTexts[selectedText]) {
      return defaultt;
    }

    return KnownTexts[selectedText];
  }, [selectedText]);

  const isAddressSet = (coin: number) => {
    return addresseValues[coin] && _isValidAddress(coin, addresseValues[coin]);
  };

  const isTextSet = (key: string) => {
    return textValues[key] && textValues[key].length > 0;
  };

  const _isValidAddress = (coin: number, value: string) => {
    if (coin === 0) {
      return isValidBtcAddress(value);
    }

    return isAddress(value);
  };

  const isValidAddress = useMemo(() => {
    const currentValue = addresseValues[selectedCoin];
    if (!currentValue || currentValue.length === 0) {
      return false;
    }

    return _isValidAddress(selectedCoin, currentValue);
  }, [selectedCoin, addresseValues]);

  const handleAddressChange = (selectedCoin: number, value: string) => {
    const _addrs = { ...addresseValues };
    _addrs[selectedCoin] = value;
    setAddressValues(_addrs);
  };

  const handleTextChange = (_selectedText: string, value: string) => {
    const _txts = { ...textValues };
    _txts[_selectedText] = value;
    setTextValues(_txts);
  };

  const getRecordsToUpdate = () => {
    const textsToChange: { key: string; value: string }[] = [];
    const addrsToChange: { coin: number; value: string }[] = [];
    const existingTexts = subname.texts ?? {};
    const existingAddresses = subname.addresses ?? {};

    Object.keys(textValues).forEach((txt) => {
      let shouldUpdate = false;
      const textValue = textValues[txt];
      if (existingTexts[txt] && existingTexts[txt].length > 0) {
        if (textValue !== existingTexts[txt]) {
          shouldUpdate = true;
        }
      } else {
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        textsToChange.push({ key: txt, value: textValue });
      }
    });

    Object.keys(addresseValues).forEach((coinType) => {
      const coin = parseInt(coinType);
      let shouldUpdate = false;
      const currentAddrValue = addresseValues[coin];
      const addrCoder = getCoderByCoinType(coin);

      if (_isValidAddress(coin, currentAddrValue)) {
        if (
          existingAddresses[`${coinType}`] &&
          existingAddresses[`${coinType}`].length > 0
        ) {
          if (addrCoder) {
            const enodedValue = addrCoder.encode(
              hexToBytes(subname.addresses[coinType] as Hex)
            );

            if (
              enodedValue.toLocaleLowerCase() !==
              currentAddrValue.toLocaleLowerCase()
            ) {
              shouldUpdate = true;
            }
          }
        } else {
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          addrsToChange.push({ coin, value: currentAddrValue });
        }
      }
    });
    return { texts: textsToChange, addrs: addrsToChange };
  };

  const hasRecordUpdates = useMemo(() => {
    const { texts, addrs } = getRecordsToUpdate();

    return texts.length > 0 || addrs.length > 0;
  }, [textValues, addresseValues]);

  const toResolverData = () => {
    const data: Hash[] = [];

    const nameNode = namehash(subname.name);
    const { texts, addrs } = getRecordsToUpdate();

    texts.forEach((txt) => {
      data.push(
        encodeFunctionData({
          abi: resolverAbi,
          args: [nameNode, txt.key, txt.value],
          functionName: "setText",
        })
      );
    });

    addrs.forEach((addr) => {
      const coder = getCoderByCoinType(addr.coin);
      if (coder) {
        let value: Hex = "0x";
        if (addr.value.length > 0) {
          const decodedAddr = coder.decode(addr.value);
          value = toHex(decodedAddr);
        }

        const encodedFunc = encodeFunctionData({
          functionName: "setAddr",
          abi: resolverAbi,
          args: [nameNode, BigInt(addr.coin), value],
        });
        data.push(encodedFunc);
      }
    });
    return data;
  };

  const handleUpdate = async () => {
    if (!publicClient || !walletClient || !address) {
      sendToast("Connect your wallet to update records");
      return;
    }

    if (chain?.id !== LISTING_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: LISTING_CHAIN_ID });
      } catch (err: unknown) {
        const message = getTxErrorMessage(
          err,
          "Please switch to Base network to update records",
        );
        if (message) {
          sendToast(message);
        }
        return;
      }
    }

    const resolverData = toResolverData();

    try {
      const resp = await publicClient.simulateContract({
        abi: parseAbi(["function multicall(bytes[] data) external"]),
        address: opResolver,
        functionName: "multicall",
        args: [resolverData],
        account: address,
      });

      try {
        setBtnState({ waitingWallet: true, waitingTx: false });
        const tx = await walletClient.writeContract(resp.request);
        if (!mountedRef.current) return;
        setBtnState({ waitingTx: true, waitingWallet: false });

        // waitForTransactionReceipt resolves for reverted txs too, so
        // the status MUST be checked — otherwise a failed multicall
        // shows "Records updated successfully!" and refreshes the
        // panel as if the write succeeded.
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: tx,
          confirmations: 2,
        });
        if (!mountedRef.current) return;
        setBtnState({ waitingTx: false, waitingWallet: false });

        if (receipt.status !== "success") {
          sendToast(
            "The transaction was reverted on-chain — records were not updated.",
          );
          return;
        }

        toast("Records updated successfully!", {
          position: "top-center",
          className: "tech-toasty",
        });

        setTimeout(() => {
          if (mountedRef.current) onUpdate();
        }, 3000);
      } catch (err: unknown) {
        const message = getTxErrorMessage(err);
        if (message) {
          sendToast(message);
        }
      } finally {
        if (mountedRef.current) {
          setBtnState({ waitingTx: false, waitingWallet: false });
        }
      }
    } catch (err: unknown) {
      const message = getTxErrorMessage(err, "Unknown error occurred :(");
      if (message) {
        sendToast(message);
      }
    }
  };

  const sendToast = (message: string) => {
    toast(message, { type: "error", className: "tech-toasty" });
  };
 
  const mintBtnLabel = btnState.waitingTx ? "Waiting for tx..." : btnState.waitingWallet ? "Waiting for wallet..." : "Update"
  const mintBtnLoading = btnState.waitingTx || btnState.waitingWallet;

  return (
    <div className="single-subname">
      <div className="d-flex align-items-center flex-column">
        <img
          className="avatar"
          src={avatarSrc}
          alt={subname.name}
          onError={() => {
            if (avatarSrc !== FALLBACK_AVATAR) setAvatarSrc(FALLBACK_AVATAR);
          }}
        />
        <p className="subtext mt-3 mb-0">{subname.name}</p>
        {canSwap && !swapping && (
          <button
            type="button"
            className="rename-btn"
            onClick={() => setSwapping(true)}
            aria-label="Rename this subname for free"
          >
            Rename (free)
            <span className="rename-btn-hint">one-time, sponsored</span>
          </button>
        )}
        {swappedTo && (
          <p className="swap-success-banner" role="status">
            You&apos;re now <strong>{swappedTo}</strong>. The list will refresh.
          </p>
        )}
        {!canSwap &&
          !swappedTo &&
          !swapping &&
          alreadySwapped &&
          subname.name.endsWith(`.${SWAP_PARENT_NAME}`) && (
            <p className="swap-used-note">
              You&apos;ve used your free rename.
            </p>
          )}
      </div>

      {swapping && (
        <SwapModal
          oldSubname={subname}
          onClose={() => setSwapping(false)}
          onSuccess={(name) => {
            setSwapping(false);
            setSwappedTo(name);
            toast(`Renamed to ${name}`, {
              className: "tech-toasty",
              type: "success",
            });
            onUpdate(name);
          }}
        />
      )}

      <div className="d-flex justify-content-center">
        <button
          type="button"
          className={`mainnav me-2 ${currentNav === "addr" ? "active" : ""}`}
          onClick={() => setCurrentNav("addr")}
        >
          Addresses
        </button>
        <button
          type="button"
          className={`mainnav ${currentNav === "text" ? "active" : ""}`}
          onClick={() => setCurrentNav("text")}
        >
          Texts
        </button>
      </div>

      {/* ADDRESSES */}
      {currentNav === "addr" && (
        <>
          <div className="record-container d-flex flex-column align-items-center">
          <p className="text-center text-green mt-1 mb-1">Select record to edit</p>
            <div className="d-flex flex-wrap justify-content-center">
              {Object.values(KnownAddresses).map((knownAddr) => (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCoin(knownAddr.coinType);
                    addressInputRef.current?.focus();
                  }}
                  className={`record-badge ${
                    isSelected(knownAddr.coinType) ? "selected" : ""
                  } ${isAddressSet(knownAddr.coinType) ? "" : "unset"}`}
                  key={knownAddr.coinType}
                >
                  <img
                    className="address me-2"
                    src={knownAddr.icon}
                    alt={knownAddr.name}
                  />
                  <div>{knownAddr.name}</div>
                </button>
              ))}
            </div>
            <div className="w-100 mt-2">
              <div className="mt-1 mb-1 input-label">
                {addressMetadata.name} address
              </div>
              <input
                ref={addressInputRef}
                placeholder={`Set ${addressMetadata.name} address...`}
                onChange={(e) =>
                  handleAddressChange(selectedCoin, e.target.value)
                }
                className="tech-input mt-1"
                value={addresseValues[selectedCoin] || ""}
              ></input>
              {!isValidAddress &&
                (addresseValues[selectedCoin] || "").length > 0 && (
                  <div className="error-msg mt-2">
                    {addressMetadata.name} address is not valid
                  </div>
                )}
            </div>
          </div>
        </>
      )}
      {/* ADDRESSES */}
      {/* TEXTS */}
      {currentNav === "text" && (
        <>
          <div className="record-container d-flex flex-column align-items-center">
          <p className="text-center text-green mt-1 mb-1">Select record to edit</p>
            <div className="d-flex flex-wrap justify-content-center">
              {Object.values(KnownTexts).map((txt) => (
                <button
                  type="button"
                  className={`record-badge ${
                    isTextSet(txt.key) ? "" : "unset"
                  } ${selectedText === txt.key ? "selected" : ""}`}
                  key={txt.key}
                  onClick={() => {
                    setSelectedText(txt.key);
                    textInputRef.current?.focus();
                  }}
                >
                  {txt.type === "profile" ? (
                    <CgProfile color="#1FE5B5" className="me-2" />
                  ) : (
                    <IoShareSocialSharp color="#1FE5B5" className="me-2" />
                  )}
                  <div>{txt.label}</div>
                </button>
              ))}
              {/* We are showing a custom/already existing records  */}
              {Object.keys(textValues)
                .filter((txt) => !KnownTexts[txt] && txt !== "avatar")
                .map((txt) => (
                  <button
                    type="button"
                    className={`record-badge ${isTextSet(txt) ? "" : "unset"}`}
                    key={txt + "-custom"}
                    onClick={() => {
                      setSelectedText(txt);
                      textInputRef.current?.focus();
                    }}
                  >
                    <CgProfile color="#2c124f" className="me-2" />
                    <div>{txt}</div>
                  </button>
                ))}
            </div>
            {selectedText && (
              <div className="w-100">
                <div className="mb-1 input-label mb-1">
                  {textMetadata.label} record
                </div>
                <input
                  ref={textInputRef}
                  value={textValues[selectedText] || ""}
                  onChange={(e) =>
                    handleTextChange(selectedText, e.target.value)
                  }
                  className="tech-input"
                  placeholder={textMetadata.placeholder}
                ></input>
              </div>
            )}
          </div>
        </>
      )}

<div className="update-btn">
        <PlainBtn
          loading={mintBtnLoading}
          disabled={!hasRecordUpdates || mintBtnLoading}
          onClick={handleUpdate}
          className="w-100"
        >
         {mintBtnLabel}
        </PlainBtn>
      </div>
    </div>
  );
}
