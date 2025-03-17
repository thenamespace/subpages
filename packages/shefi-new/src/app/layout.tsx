
import localFont from 'next/font/local'

import { cn } from '@/lib/utils'

import './globals.css'
import { WalletConnector } from '@/components/WalletConnect'

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
