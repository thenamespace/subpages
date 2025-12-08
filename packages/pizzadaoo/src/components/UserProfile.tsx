"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useDisconnect, usePublicClient } from "wagmi";

export const UserProfile = () => {
  const publicClient = usePublicClient({ chainId: 1 });
  const { disconnectAsync } = useDisconnect();
  const { address } = useAccount();
  const [profile, setProfile] = useState<{
    fetching: boolean;
    name?: string;
    avatar?: string;
  }>({
    fetching: true,
  });

  useEffect(() => {
    if (!address || !publicClient) {
      return;
    }

    const init = async () => {
      let ensName: string | undefined = undefined;
      let ensAvatar: string | undefined = undefined;

      try {
        const resolvedName = await publicClient.getEnsName({ address });
        if (resolvedName) {
          ensName = resolvedName;
          const avatar = await publicClient.getEnsAvatar({ name: resolvedName });
          if (avatar) {
            ensAvatar = avatar;
          }
        }
      } catch (error) {
        console.error("Failed to resolve ENS profile", error);
      } finally {
        setProfile({ fetching: false, name: ensName, avatar: ensAvatar });
      }
    };

    init();
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
              {profile.avatar && (
                <img className="avatar" width={30} src={profile.avatar}></img>
              )}
              {!profile.avatar && <div className="avatar-template"></div>}
            </div>
            <div className="col ps-1 col-lg-9 d-flex flex-column justify-content-center">
              <p
                className="m-0 mb-1"
                style={{ color: "white", lineHeight: "15px", fontSize:14 }}
              >
                {shortedAddr(profile.name ?? "" ) || "Anonymous"}
              </p>
              {!profile.name && (
                <p className="m-0" style={{ fontSize: 12, lineHeight: "12px" }}>
                  {shortedAddr(address)}
                </p>
              )}
            </div>
          </div>
          <p onClick={() => disconnectAsync()} className="dc">
            Disconnect
          </p>
        </div>
      </div>
    </div>
  );
};

const shortedAddr = (addr: string) => {
  if (!addr) {
    return;
  }

  if (addr.length <= 12) {
    return addr;
  }

  return addr.substring(0, 9) + "...";
};
