import localFont from 'next/font/local'

import { cn } from '@/lib/utils'

import './globals.css'
import '@thenamespace/ens-components/index.css'
import { WalletConnector } from '../components/WalletConnect';
import { PrimaryNameProvider } from '@/contexts/PrimaryNameContext';
import { Navigation } from '@/components/Navigation';
import { Metadata, Viewport } from 'next'
import { PropsWithChildren } from 'react';
import { Toaster } from 'react-hot-toast';

const seasonsFont = localFont({
  src: '../assets/fonts/TheSeasons-reg.woff2',
  variable: '--font-seasons',
  display: 'swap',
})

const cyGroteskFont = localFont({
  src: [
    { path: '../assets/fonts/CyGroteskKeyBold-Regular.woff2', weight: '400' },
    { path: '../assets/fonts/CyGroteskKeyBold-Bold.woff2', weight: '700' },
  ],
  variable: '--font-cy-grotesk',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
}

export const metadata: Metadata = {
  title: 'SheFi + Namespace',
  description: 'Mint your own shefi.eth subname!',
  openGraph: {
    title: 'SheFi + Namespace',
    description: 'Mint your own shefi.eth subname!',
    images: [
      {
        url: 'https://ipfs.io/ipfs/bafybeibdzhz7lwx6q6oxwrkiufrgncpuv4aeccsycytlnnycpkudt2is4a',
        width: 1500,
        height: 735,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SheFi + Namespace',
    description: 'Mint your own shefi.eth subname!',
    images: [
      {
        url: 'https://ipfs.io/ipfs/bafybeibdzhz7lwx6q6oxwrkiufrgncpuv4aeccsycytlnnycpkudt2is4a',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: PropsWithChildren) {
  return (
    <html
      lang="en"
      className={cn(seasonsFont.variable, cyGroteskFont.variable)}
    >
      <head>
        <meta property="og:title" content="SheFi + Namespace" />
        <meta property="og:description" content="Mint your own shefi.eth subname!" />
        <meta property="og:image" content="https://ipfs.io/ipfs/bafybeibdzhz7lwx6q6oxwrkiufrgncpuv4aeccsycytlnnycpkudt2is4a" />
        <meta property="og:image:width" content="1500" />
        <meta property="og:image:height" content="735" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SheFi + Namespace" />
        <meta name="twitter:description" content="Mint your own shefi.eth subname!" />
        <meta name="twitter:image" content="https://ipfs.io/ipfs/bafybeibdzhz7lwx6q6oxwrkiufrgncpuv4aeccsycytlnnycpkudt2is4a" />
      </head>
      <body className="min-h-screen bg-gradient-page pb-16 sm:pb-0">
        <WalletConnector>
          <PrimaryNameProvider>
            <Navigation />
            <main>{children}</main>
            <Toaster position="bottom-center" />
          </PrimaryNameProvider>
        </WalletConnector>
      </body>
    </html>
  )
}
