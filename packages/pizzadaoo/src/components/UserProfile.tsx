import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect, usePublicClient } from "wagmi";
import { mainnet } from "wagmi/chains";
import { formatEnsName, shortenAddress } from "../utils/format";

interface ProfileState {
  fetching: boolean;
  name?: string;
  avatar?: string;
}

export const UserProfile = () => {
  // ENS lives on L1 — resolve against mainnet (configured in WalletConnect).
  const publicClient = usePublicClient({ chainId: mainnet.id });
  const { disconnectAsync } = useDisconnect();
  const { address } = useAccount();
  const [profile, setProfile] = useState<ProfileState>({ fetching: true });
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!address || !publicClient) {
      return;
    }

    let cancelled = false;

    const init = async () => {
      let ensName: string | undefined;
      let ensAvatar: string | undefined;

      try {
        const resolvedName = await publicClient.getEnsName({ address });
        if (resolvedName) {
          ensName = resolvedName;
          const avatar = await publicClient.getEnsAvatar({
            name: resolvedName,
          });
          if (avatar) {
            ensAvatar = avatar;
          }
        }
      } catch (error) {
        console.error("Failed to resolve ENS profile", error);
      } finally {
        if (!cancelled) {
          setProfile({ fetching: false, name: ensName, avatar: ensAvatar });
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!address || profile.fetching) {
    return null;
  }

  const showAvatar = profile.avatar && !avatarFailed;
  const primary = profile.name
    ? formatEnsName(profile.name)
    : shortenAddress(address);

  return (
    <div className="account" ref={rootRef}>
      <button
        type="button"
        className="account__chip"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {showAvatar ? (
          <img
            className="account__avatar"
            src={profile.avatar}
            alt=""
            width={32}
            height={32}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <span className="account__avatar account__avatar--ph" aria-hidden="true" />
        )}
        <span className="account__name" title={profile.name}>
          {primary}
        </span>
        <span className={`account__caret ${open ? "is-open" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="account__menu" role="menu">
          <div className="account__id">
            <span className="account__id-name">{primary}</span>
            <span className="account__id-addr">{shortenAddress(address)}</span>
          </div>
          <button
            type="button"
            role="menuitem"
            className="account__disconnect"
            onClick={() => {
              setOpen(false);
              disconnectAsync();
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
