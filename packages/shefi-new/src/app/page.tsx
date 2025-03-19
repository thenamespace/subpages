"use client"

import { Toaster } from 'react-hot-toast'

import { XIcon } from '@/components/Icons'
import { Squiggle } from '@/components/Squiggle'
import { ConnectedButton } from '@/components/ConnectButton'
import { MintForm } from '@/components/MainForm'
import axios from 'axios'
import { ProfileCard } from '@/components/ProfileCard'
import { useEffect, useState } from 'react'
import Head from 'next/head'

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

  const [profiles, setProfiles] = useState<L2SubnamePagedResponse>();


  const getProfiles = async () => {
    const profiles: L2SubnamePagedResponse = await axios
      .get(
        `https://staging.indexer.namespace.ninja/api/v1/subnames?network=base&parentName=shefi.eth&pageSize=50`,
        {}
      )
      .then((res) => res.data);
    return profiles;
  };


  useEffect(() => {
    getProfiles().then((profiles) => {
      setProfiles(profiles);
    });
  }
  , []);


  return (
    <main className='overflow-x-hidden'>
      <section className="bg-gradient-radial">
        {/* Nav */}
        <nav className="flex items-center justify-between p-6 sm:p-8">
          <img src="/logo.webp" alt="logo" className="w-20 sm:w-28" />
          <ConnectedButton />
          
        </nav>

        {/* Hero */}
        <section className="mx-auto flex min-h-[75svh] max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
          <h1 className="text-4xl sm:text-6xl">
            SheFi Usernames
          </h1>

          <span className="mb-8 mt-3 text-lg sm:text-xl">
            Free ENS names for the SheFi community
          </span>

          {/* Main interactive form */}
          
          <MintForm />
          
        </section>
      </section>

      <Squiggle className="bg-gradient-to-b from-[#EDEDEB] to-transparent" />

      {/* Connect */}
      
      <section className="flex min-h-[25svh] flex-col items-center justify-center gap-6 px-6 py-10 text-center sm:gap-8 sm:px-8 sm:py-14">
        <h2 className="text-2xl sm:text-4xl">Connect with each other</h2>

        <div className="grid w-full max-w-4xl grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          
          {profiles?.items.map((profile) => (
            <ProfileCard key={profile.name} profile={profile} />
          ))}
            
        </div>
      </section>
      

      {/* Footer */}
      <footer className="flex items-center justify-between gap-6 bg-brand-dark px-6 py-4 text-brand-light sm:px-8 sm:py-6">
        <div className="flex flex-col text-sm sm:text-base">
          <span>
            Powered by{' '}
            <a
              href="https://namespace.ninja/"
              target="_blank"
              className="text-brand-pink underline"
            >
              Namespace
            </a>
          </span>
          <span>
            <a
              href="https://github.com/thenamespace/subpages"
              target="_blank"
              className="text-brand-pink underline"
            >
              View subpages on GitHub
            </a>
          </span>
        </div>

        <div className="flex gap-3 text-brand-pink">
          <a href="https://x.com/shefiorg" target="_blank">
            <XIcon className="h-6 w-6" />
          </a>
        </div>
      </footer>

      <Toaster position="bottom-center" />
    </main>
  )
}
