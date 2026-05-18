import Link from "next/link";
import { useEffect, useState } from "react";
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

  if (!address || profile.fetching) {
    return null;
  }

  const showAvatar = profile.avatar && !avatarFailed;

  return (
    <div className="user-profile-cont">
      <nav className="nav-container">
        <Link href="/" className="nav-item">
          Register
        </Link>
        <Link href="/subnames" className="nav-item">
          My Names
        </Link>
      </nav>
      <div className="user-profile">
        {showAvatar ? (
          <img
            className="avatar"
            src={profile.avatar}
            alt=""
            width={34}
            height={34}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <div className="avatar-template" aria-hidden="true" />
        )}
        <div className="identity">
          <span className="identity-name" title={profile.name}>
            {profile.name
              ? formatEnsName(profile.name)
              : shortenAddress(address)}
          </span>
          <span className="identity-sub">
            {profile.name ? shortenAddress(address) : "Anonymous"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => disconnectAsync()}
          className="dc"
          aria-label="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};
