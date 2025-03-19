
import localFont from 'next/font/local'

import { cn } from '@/lib/utils'

import './globals.css'
import { WalletConnector } from '@/components/WalletConnect'
import { Metadata } from 'next'

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


export const metadata: Metadata = {
  title: 'SheFi + Namespace',
  description: 'Mint your own shefi.eth subname!',
  viewport: 'width=device-width, initial-scale=1.0',
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
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(seasonsFont.variable, cyGroteskFont.variable)}
    >
      <body>
        <WalletConnector>{children}</WalletConnector>
      </body>
    </html>
  )
}
