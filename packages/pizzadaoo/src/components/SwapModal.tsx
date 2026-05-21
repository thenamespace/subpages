import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useSignMessage, useSwitchChain } from "wagmi";
import { normalise } from "@ensdomains/ensjs/utils";
import { Hex, namehash } from "viem";
import { toast } from "react-toastify";
import { PlainBtn } from "./TechBtn";
import { Spinner } from "./Spinner";
import { LISTING_CHAIN_ID, SWAP_PARENT_NAME } from "./Listing";
import { Subname } from "./Models";
import {
  constructSwapMessageHash,
  getSwapExpiry,
  submitSwap,
} from "../utils/swap";
import { createMintClient } from "@namespacesdk/mint-manager";
import { debounce } from "../utils/debounce";
import { getTxErrorMessage, isUserRejection } from "../utils/txError";

let mintClientSingleton: ReturnType<typeof createMintClient> | undefined;
const getMintClient = () =>
  (mintClientSingleton ??= createMintClient({ mintSource: "pizzadaoo-swap" }));

type Availability =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

type Phase = "idle" | "signing" | "submitting" | "done";

interface Props {
  oldSubname: Subname;
  onClose: () => void;
  onSuccess: (newName: string) => void;
}

export const SwapModal = ({ oldSubname, onClose, onSuccess }: Props) => {
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const [label, setLabel] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  // Cache the signature + expiry so a network failure on /api/swap doesn't
  // force the user to re-open their wallet — they can just retry the POST.
  const cachedSigRef = useRef<{
    signature: Hex;
    expiry: bigint;
    label: string;
  } | null>(null);

  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  // Autofocus the input on mount — single-purpose modal.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const checkAvailable = async (value: string) => {
    try {
      const isAvail = await getMintClient().isL2SubnameAvailable(
        `${value}.${SWAP_PARENT_NAME}`,
        LISTING_CHAIN_ID,
      );
      if (!mountedRef.current) return;
      setAvailability(isAvail ? "available" : "unavailable");
    } catch {
      if (!mountedRef.current) return;
      setAvailability("error");
    }
  };

  const debouncedCheck = useMemo(
    () => debounce((v: string) => void checkAvailable(v), 300),
    [],
  );
  useEffect(() => () => debouncedCheck.cancel(), [debouncedCheck]);

  const handleLabelChange = (raw: string) => {
    const v = raw.toLowerCase();
    if (v.includes(".")) return;
    if (v.length > 0) {
      try {
        normalise(v);
      } catch {
        return;
      }
    }
    // Any edit invalidates the cached signature (it's tied to the old label).
    cachedSigRef.current = null;
    setLabel(v);
    setError(null);
    if (v.length === 0) {
      setAvailability("idle");
      return;
    }
    setAvailability("checking");
    debouncedCheck(v);
  };

  const performSwap = async (signature: Hex, expiry: bigint) => {
    if (!address) return;
    setPhase("submitting");
    try {
      const res = await submitSwap({
        owner: address,
        oldNode: namehash(oldSubname.name) as Hex,
        oldFullName: oldSubname.name,
        newLabel: label,
        expiry: expiry.toString(),
        signature,
      });
      if (!mountedRef.current) return;
      setPhase("done");
      onSuccess(res.name);
    } catch (err) {
      if (!mountedRef.current) return;
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Swap failed");
    }
  };

  const handleSwap = async () => {
    if (!address) return;
    setError(null);

    // Re-submit path: signature still valid (same label, not expired).
    const cached = cachedSigRef.current;
    if (
      cached &&
      cached.label === label &&
      cached.expiry > BigInt(Math.floor(Date.now() / 1000) + 10)
    ) {
      await performSwap(cached.signature, cached.expiry);
      return;
    }

    if (chain?.id !== LISTING_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: LISTING_CHAIN_ID });
      } catch (err) {
        if (!isUserRejection(err)) {
          toast("Please switch to Base to continue.", {
            className: "tech-toasty",
            type: "error",
          });
        }
        return;
      }
    }

    const expiry = getSwapExpiry();
    const hash = constructSwapMessageHash(
      address,
      namehash(oldSubname.name) as Hex,
      oldSubname.name,
      label,
      expiry,
    );

    setPhase("signing");
    let signature: Hex;
    try {
      signature = await signMessageAsync({ message: { raw: hash } });
    } catch (err) {
      if (!mountedRef.current) return;
      setPhase("idle");
      if (!isUserRejection(err)) {
        setError(getTxErrorMessage(err) || "Signing failed. Please try again.");
      }
      return;
    }

    cachedSigRef.current = { signature, expiry, label };
    await performSwap(signature, expiry);
  };

  const busy = phase === "signing" || phase === "submitting";
  const canSubmit =
    label.length > 0 && availability === "available" && !busy;
  const newFullName = label ? `${label}.${SWAP_PARENT_NAME}` : "";

  const availabilityCopy: Record<Availability, string> = {
    idle: "Type a new label above.",
    checking: "Checking availability…",
    available: `${newFullName} is available`,
    unavailable: "That name is already taken.",
    error: "Couldn't check availability. Try again.",
  };

  return (
    <div className="swap-modal" role="document">
      <header className="swap-modal__header">
        <p className="swap-modal__eyebrow">Rename your name</p>
        <h2 className="swap-modal__title">Pick a new label</h2>
        <p className="swap-modal__lede">
          We&rsquo;ll burn your current name and mint the new one to your
          wallet. One signature, gas&rsquo;s on us.
        </p>
      </header>

      <section className="swap-modal__compare" aria-label="Name change preview">
        <div className="swap-modal__name swap-modal__name--old">
          <span className="swap-modal__name-label">From</span>
          <span className="swap-modal__name-value" title={oldSubname.name}>
            {oldSubname.name}
          </span>
        </div>
        <div className="swap-modal__arrow" aria-hidden="true">
          &rarr;
        </div>
        <div className="swap-modal__name swap-modal__name--new">
          <span className="swap-modal__name-label">To</span>
          <span className="swap-modal__name-value">
            {label ? (
              <>
                <span className="swap-modal__name-input">{label}</span>
                <span className="swap-modal__name-parent">
                  .{SWAP_PARENT_NAME}
                </span>
              </>
            ) : (
              <span className="swap-modal__name-placeholder">
                new-label.{SWAP_PARENT_NAME}
              </span>
            )}
          </span>
        </div>
      </section>

      <div className="swap-modal__field">
        <label className="swap-modal__field-label" htmlFor="swap-new-label">
          New label
        </label>
        <div className="swap-modal__input-wrap tech-input-container">
          <input
            id="swap-new-label"
            ref={inputRef}
            className="tech-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g. pepperoni"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            disabled={busy}
            aria-describedby="swap-availability swap-records-note"
            aria-invalid={availability === "unavailable"}
            maxLength={64}
          />
          {availability === "checking" && (
            <div className="loader-cont" aria-hidden="true">
              <Spinner />
            </div>
          )}
        </div>

        <p
          id="swap-availability"
          className={`swap-modal__availability is-${availability}`}
          aria-live="polite"
        >
          {availability === "available" && (
            <span className="swap-modal__avail-dot" aria-hidden="true" />
          )}
          <span>{availabilityCopy[availability]}</span>
        </p>

        <p id="swap-records-note" className="swap-modal__note">
          Your avatar and addresses carry over automatically.
        </p>
      </div>

      {busy && (
        <div
          className="swap-modal__progress"
          role="status"
          aria-live="polite"
        >
          <Spinner />
          <div className="swap-modal__progress-text">
            <p className="swap-modal__progress-title">
              {phase === "signing"
                ? "Confirm in your wallet…"
                : "Swapping on Base…"}
            </p>
            <p className="swap-modal__progress-sub">
              {phase === "signing"
                ? "Sign the message to authorize the rename."
                : "Burning the old name and minting the new one. Hang tight — usually 4–10 seconds."}
            </p>
          </div>
        </div>
      )}

      {error && !busy && (
        <div className="swap-modal__error" role="alert">
          <p className="swap-modal__error-msg">{error}</p>
          <button
            type="button"
            className="swap-modal__error-retry"
            onClick={handleSwap}
          >
            Try again
          </button>
        </div>
      )}

      <div className="swap-modal__actions">
        <button
          type="button"
          className="swap-modal__cancel"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </button>
        <PlainBtn
          onClick={handleSwap}
          disabled={!canSubmit}
          loading={busy}
          className="swap-modal__submit"
        >
          {phase === "signing"
            ? "Waiting for signature…"
            : phase === "submitting"
              ? "Swapping…"
              : "Sign & swap"}
        </PlainBtn>
      </div>
    </div>
  );
};
