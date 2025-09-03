"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrum, mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// You can swap `mainnet` for your custom HL chain definition if you have it.
const config = createConfig({
  chains: [mainnet, arbitrum],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(), // uses default public RPC,
    [arbitrum.id]: http(),
  },
});

export function WagmiProviders({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
