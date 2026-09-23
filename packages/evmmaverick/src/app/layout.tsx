import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Press_Start_2P } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Display only. Press Start 2P has one weight by design and is unreadable
// below ~16px, so it never carries body copy on this page.
const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

// Everything else, including hex addresses — hence a real mono with tabular
// figures rather than a second pixel face.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute URLs for OG and Twitter cards. Falls back to localhost so a dev
  // build doesn't warn; set NEXT_PUBLIC_SITE_URL on the deployed build or the
  // share preview points at nothing.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "EVMaverick Names",
  description:
    "Mint a free evmaverick.eth ENS name with your EVMavericks NFT.",
  openGraph: {
    title: "EVMaverick Names",
    description:
      "Mint a free evmaverick.eth ENS name with your EVMavericks NFT.",
    images: ["/evmavericks.png"],
  },
  twitter: {
    card: "summary",
    title: "EVMaverick Names",
    description:
      "Mint a free evmaverick.eth ENS name with your EVMavericks NFT.",
    images: ["/evmavericks.png"],
  },
  icons: { icon: "/evmavericks.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b0706",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${pressStart.variable} ${jetbrains.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
