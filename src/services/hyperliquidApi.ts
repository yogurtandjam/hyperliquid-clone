"use client";

import * as hl from "@nktkas/hyperliquid";
import { Address, createWalletClient, custom } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/** Env / network */
const isTestnet =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_HL_TESTNET === "true";

const HTTP_URL = isTestnet
  ? "https://api.hyperliquid-testnet.xyz"
  : "https://api.hyperliquid.xyz";

const WS_URL = isTestnet
  ? "wss://api.hyperliquid-testnet.xyz/ws"
  : "wss://api.hyperliquid.xyz/ws";

/** Base transports */
export const httpTransport = new hl.HttpTransport({
  server: {
    mainnet: {
      api: HTTP_URL,
    },
  },
  timeout: 10_000,
});

export const wsTransport = new hl.WebSocketTransport({
  url: WS_URL,
  timeout: 10_000,
  keepAlive: { interval: 20_000 },
  reconnect: {
    maxRetries: 10,
    connectionDelay: (attempt) => Math.min(10_000, 500 * 2 ** attempt),
  },
});

/** Clients (names aligned to your requested API) */
export const infoClient = new hl.InfoClient({ transport: httpTransport });
export const subscriptionClient = new hl.SubscriptionClient({
  transport: wsTransport,
});

/** Trading client for user agent operations */
let tradingClient: hl.ExchangeClient | null = null;

export const createAgentExchangeClient = ({
  agentPrivateKey,
}: {
  agentPrivateKey: `0x${string}`;
}) => {
  tradingClient = new hl.ExchangeClient({
    transport: httpTransport,
    wallet: agentPrivateKey,
    isTestnet,
  });
  return tradingClient;
};

export const getAgentExchangeClient = (): hl.ExchangeClient => {
  if (!tradingClient) {
    throw new Error(
      "Trading client not initialized. Call createTradingClient first.",
    );
  }
  return tradingClient;
};

/** Approve agent — MUST be signed by MASTER */
export const approveAgentWithMaster = async (params: {
  masterPk: Address;
  agentAddress: Address;
  agentName?: string;
}) => {
  const masterClient = new hl.ExchangeClient({
    transport: httpTransport,
    wallet: params.masterPk,
    isTestnet,
  });

  return masterClient.approveAgent({
    agentAddress: params.agentAddress,
    agentName: params.agentName ?? null,
  });
};

/** Optional: simple token bucket to be polite with /info */
class RateLimiter {
  capacity: number;
  tokens: number;
  refill: number;
  last: number;
  constructor(capacity = 20, refillPerSecond = 10) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refill = refillPerSecond;
    this.last = Date.now();
  }
  async take(cost = 1) {
    const now = Date.now();
    const elapsed = (now - this.last) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refill);
    this.last = now;
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return;
    }
    const waitMs = ((cost - this.tokens) / this.refill) * 1000;
    await new Promise((r) => setTimeout(r, waitMs));
    this.tokens = 0;
  }
}
export const infoLimiter = new RateLimiter();

/** -------------------------
 *  Hyperliquid API (HTTP)
 *  ---------------------- */
export const hyperliquidApi = {
  getAllMids: async () => {
    try {
      await infoLimiter.take(1);
      return await infoClient.allMids();
    } catch (err) {
      console.error("Error fetching allMids:", err);
      throw err;
    }
  },

  getMeta: async () => {
    try {
      await infoLimiter.take(1);
      return await infoClient.meta();
    } catch (err) {
      console.error("Error fetching meta:", err);
      throw err;
    }
  },

  getL2Book: async (coin: string) => {
    try {
      await infoLimiter.take(1);
      return await infoClient.l2Book({ coin });
    } catch (err) {
      console.error("Error fetching L2 book:", err);
      throw err;
    }
  },

  getCandleSnapshot: async (
    coin: string,
    interval: "1m" | "5m" | "30m" | "1h" | "2h" | "1w",
    startTime: number,
    endTime: number,
  ) => {
    try {
      await infoLimiter.take(1);
      // flat shape (the SDK wraps in req)
      return await infoClient.candleSnapshot({
        coin,
        interval,
        startTime,
        endTime,
      });
    } catch (err) {
      console.error("Error fetching candle snapshot:", err);
      throw err;
    }
  },

  getUserOpenOrders: async (user: Address) => {
    try {
      await infoLimiter.take(1);
      return await infoClient.openOrders({ user });
    } catch (err) {
      console.error("Error fetching open orders:", err);
      throw err;
    }
  },

  getUserFills: async (user: Address, aggregateByTime?: boolean) => {
    try {
      await infoLimiter.take(1);
      return await infoClient.userFills({ user, aggregateByTime });
    } catch (err) {
      console.error("Error fetching user fills:", err);
      throw err;
    }
  },

  getUserState: async (user: Address) => {
    try {
      await infoLimiter.take(1);
      return await infoClient.clearinghouseState({ user });
    } catch (err) {
      console.error("Error fetching user state:", err);
      throw err;
    }
  },

  getFundingHistory: async (
    user: Address,
    startTime: number,
    endTime?: number,
  ) => {
    try {
      await infoLimiter.take(1);
      return await infoClient.userFunding({ user, startTime, endTime });
    } catch (err) {
      console.error("Error fetching funding history:", err);
      throw err;
    }
  },

  getRecentTrades: async (user: Address) => {
    try {
      await infoLimiter.take(1);
      return await infoClient.userFills({ user });
    } catch (err) {
      console.error("Error fetching user fills by time history:", err);
      throw err;
    }
  },

  getUserOrderHistory: async (user: Address) => {
    try {
      await infoLimiter.take(1);
      return await infoClient.historicalOrders({ user });
    } catch (err) {
      console.error("Error fetching user order history:", err);
      throw err;
    }
  },

  getTwapData: async (user: Address) => {
    try {
      await infoLimiter.take(1);
      // Note: TWAP calculation would typically be done client-side using candle data
      // or if the API provides a specific TWAP endpoint, use that instead
      return await infoClient.userTwapSliceFills({
        user,
      });
    } catch (err) {
      console.error("Error fetching TWAP data:", err);
      throw err;
    }
  },

  // User Agent Operations
  approveAgentWithWallet: async ({
    ownerAddress,
    agentPk, // the agent's *private key* you generated locally
    agentName,
  }: {
    ownerAddress: Address;
    agentPk: `0x${string}`;
    agentName: string;
  }) => {
    // 1) Get injected wallet (MetaMask/Rabby/etc.)
    const eth = (globalThis as any).ethereum;
    if (!eth) throw new Error("No EVM provider found (window.ethereum)");

    // 2) Use the connected owner account as signer
    const wallet = createWalletClient({
      // You can also pass { account: ownerAddress } if you have it handy;
      // viem will infer from the provider’s selected account when omitted.
      account: ownerAddress,
      transport: custom(eth),
    });

    // 3) Make an ExchangeClient that uses that signer
    const exch = new hl.ExchangeClient({
      transport: httpTransport,
      wallet,
      isTestnet,
    });

    // 4) Derive agent address from the agent PK (do NOT send the PK anywhere)
    const agentAddress = privateKeyToAccount(agentPk).address as `0x${string}`;

    // 5) Approve/register the agent on HL
    const res = await exch.approveAgent({ agentAddress, agentName });
    console.log("✅ User agent approved:", res);
    return res;
  },

  // Trading Operations
  placeMarketOrder: async (
    asset: number,
    is_buy: boolean,
    sz: string,
    reduce_only = false,
  ) => {
    try {
      const client = getAgentExchangeClient();
      const result = await client.order({
        orders: [
          {
            a: asset,
            b: is_buy,
            p: "0", // Market orders use "0" for price
            s: sz,
            r: reduce_only,
            t: { limit: { tif: "FrontendMarket" } },
          },
        ],
        grouping: "na",
      });
      console.log("✅ Market order placed:", result);
      return result;
    } catch (err) {
      console.error("Error placing market order:", err);
      throw err;
    }
  },

  placeLimitOrder: async (
    asset: number,
    is_buy: boolean,
    sz: string,
    limit_px: string,
    tif: "Alo" | "Ioc" | "Gtc" = "Gtc",
    reduce_only = false,
  ) => {
    try {
      const client = getAgentExchangeClient();
      const result = await client.order({
        orders: [
          {
            a: asset,
            b: is_buy,
            p: limit_px,
            s: sz,
            r: reduce_only,
            t: { limit: { tif } },
          },
        ],
        grouping: "na",
      });
      console.log("✅ Limit order placed:", result);
      return result;
    } catch (err) {
      console.error("Error placing limit order:", err);
      throw err;
    }
  },

  cancelOrder: async (asset: number, oid: number) => {
    try {
      const client = getAgentExchangeClient();
      const result = await client.cancel({
        cancels: [{ a: asset, o: oid }],
      });
      console.log("✅ Order cancelled:", result);
      return result;
    } catch (err) {
      console.error("Error cancelling order:", err);
      throw err;
    }
  },

  cancelAllOrders: async (asset?: number) => {
    try {
      const client = getAgentExchangeClient();
      const result = await client.scheduleCancel();
      console.log("✅ All orders cancelled:", result);
      return result;
    } catch (err) {
      console.error("Error cancelling all orders:", err);
      throw err;
    }
  },
};
