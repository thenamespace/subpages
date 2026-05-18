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

  return (
    <div className="user-profile-cont d-flex align-items-center">
      <div className="nav-container me-3 d-flex">
        <Link href="/">
          <div className="nav-item me-3">Register</div>
        </Link>
        <Link href="/subnames">
          <div className="nav-item ">My Names</div>
        </Link>
      </div>
      <div className="user-profile">
        <div>
          <div className="row g-0">
            <div className="col col-xs-3 mt-1">
              {profile.avatar ? (
                <img className="avatar" width={30} src={profile.avatar} alt="" />
              ) : (
                <div className="avatar-template"></div>
              )}
            </div>
            <div className="col ps-1 col-lg-9 d-flex flex-column justify-content-center">
              <p
                className="m-0 mb-1"
                style={{ color: "white", lineHeight: "15px", fontSize: 14 }}
                title={profile.name}
              >
                {profile.name
                  ? formatEnsName(profile.name)
                  : shortenAddress(address)}
              </p>
              {!profile.name && (
                <p
                  className="m-0"
                  style={{ fontSize: 12, lineHeight: "12px" }}
                >
                  Anonymous
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => disconnectAsync()}
            className="dc"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};
