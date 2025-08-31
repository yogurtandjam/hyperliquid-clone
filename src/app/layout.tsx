import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientBody } from "./ClientBody";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hyperliquid Clone - Decentralized Trading Platform",
  description: "Trade 100+ perps and spot assets on a decentralized Layer 1 blockchain with fully onchain order books.",
  keywords: "trading, defi, perpetuals, spot trading, hyperliquid, decentralized exchange",
  authors: [{ name: "Hyperliquid Clone" }],
  openGraph: {
    title: "Hyperliquid Clone - Decentralized Trading Platform",
    description: "Trade 100+ perps and spot assets on a decentralized Layer 1 blockchain with fully onchain order books.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
