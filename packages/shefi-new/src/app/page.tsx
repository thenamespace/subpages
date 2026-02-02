"use client";

import { XIcon } from "@/components/Icons";
import { Squiggle } from "@/components/Squiggle";
import { MintForm } from "@/components/MainForm";
import axios from "axios";
import { ProfileCard } from "@/components/ProfileCard";
import { useEffect, useState } from "react";
import Link from "next/link";
import { INDEXER_URL, PARENT_NAME } from "@/constants";

export interface L2SubnamePagedResponse {
  items: L2SubnameResponse[];
  totalItems: number;
  page: number;
  pageSize: number;
}

export interface L2SubnameResponse {
  name: string;
  namehash: string;
  label: string;
  parentNamehash: string;
  owner: string;
  texts: Record<string, string>;
  addresses: Record<string, string>;
  contenthash?: string;
  chainId: number;
  expiry: number;
  mintTransaction?: {
    price: number;
    paymentReceiver: string;
  };
}

export default function Home() {
  const [profiles, setProfiles] = useState<L2SubnameResponse[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const getProfiles = async (page: number) => {
    setLoading(true);
    const response = await axios.get<{ items: L2SubnameResponse[] }>(
      `${INDEXER_URL}/subnames?network=base&parentName=${PARENT_NAME}&pageSize=50&page=${page}`,
      {}
    );

    const items: L2SubnameResponse[] = (response.data.items || []).filter(
      (i) => !i.label.includes("test1")
    );

    setProfiles((prevProfiles) => [...prevProfiles, ...items]);
    setHasMore(items.length > 0);
    setLoading(false);
    return profiles;
  };

  useEffect(() => {
    getProfiles(page);
  }, [page]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 2 &&
        hasMore &&
        !loading
      ) {
        setPage((prevPage) => prevPage + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, hasMore]);

  return (
    <div className="overflow-x-hidden">
      <section className="bg-gradient-radial">
        {/* Hero */}
        <section className="mx-auto flex min-h-[80svh] max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
          <h1 className="text-4xl sm:text-6xl">SheFi Usernames</h1>

          <span className="mb-8 mt-3 text-lg sm:text-xl">
            Free ENS names for the SheFi community
          </span>

          {/* Main interactive form */}
          <MintForm />
        </section>
      </section>

      <Squiggle />

      {/* Connect */}
      <section className="flex min-h-[25svh] flex-col items-center justify-center gap-6 px-6 py-10 text-center sm:gap-8 sm:px-8 sm:py-14">
        <h2 className="text-2xl sm:text-4xl">Connect with each other</h2>

        <div className="grid w-full max-w-4xl grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {profiles.map((profile, index) => (
            <Link
              href={`/name/${profile.label}`}
              key={`${profile.name}-${index}`}
              className="cursor-pointer transition-transform hover:-translate-y-1"
            >
              <ProfileCard profile={profile} />
            </Link>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-brand-dark/60">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
            Loading more...
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between gap-6 bg-brand-dark px-6 py-4 text-white sm:px-8 sm:py-6">
        <div className="flex flex-col text-sm sm:text-base">
          <span>
            Powered by{" "}
            <a
              href="https://namespace.ninja/"
              target="_blank"
              className="text-brand-pink hover:text-white underline transition-colors"
            >
              Namespace
            </a>
          </span>
          <span>
            <a
              href="https://github.com/thenamespace/subpages"
              target="_blank"
              className="text-brand-pink hover:text-white underline transition-colors"
            >
              View subpages on GitHub
            </a>
          </span>
        </div>

        <div className="flex gap-3 text-brand-pink hover:text-white transition-colors">
          <a href="https://x.com/shefiorg" target="_blank">
            <XIcon className="h-6 w-6" />
          </a>
        </div>
      </footer>
    </div>
  );
}
