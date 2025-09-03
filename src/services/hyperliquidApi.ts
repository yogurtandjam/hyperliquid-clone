"use client";

import * as hl from "@nktkas/hyperliquid";
import { Address } from "viem";

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
  url: HTTP_URL,
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
export const infoClient = new hl.PublicClient({ transport: httpTransport });
export const subscriptionClient = new hl.EventClient({
  transport: wsTransport,
});

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

  // Try both shapes to be future-proof (userState vs clearinghouseState)
  getUserState: async (user: string) => {
    try {
      await infoLimiter.take(1);
      const anyClient = infoClient as any;
      if (typeof anyClient.userState === "function") {
        return await anyClient.userState({ user });
      }
      if (typeof anyClient.clearinghouseState === "function") {
        return await anyClient.clearinghouseState({ user });
      }
      throw new Error("No user state method on client");
    } catch (err) {
      console.error("Error fetching user state:", err);
      throw err;
    }
  },

  getFundingHistory: async (
    user: string,
    startTime: number,
    endTime?: number,
  ) => {
    try {
      await infoLimiter.take(1);
      if (typeof infoClient.userFunding === "function") {
        return await infoClient.userFunding({ user, startTime, endTime });
      }
      throw new Error("No funding history method on client");
    } catch (err) {
      console.error("Error fetching funding history:", err);
      throw err;
    }
  },

  getRecentTrades: async (user: Address) => {
    try {
      await infoLimiter.take(1);
      if (typeof infoClient.userFills === "function") {
        return await infoClient.userFills({ user });
      }
      throw new Error("No user fills by time method on client");
    } catch (err) {
      console.error("Error fetching user fills by time history:", err);
      throw err;
    }
  },

  getUserOrderHistory: async (user: Address) => {
    try {
      await infoLimiter.take(1);
      if (typeof infoClient.historicalOrders === "function") {
        return await infoClient.historicalOrders({ user });
      }
      throw new Error("No user fills method on client");
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
};
