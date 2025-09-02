import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatters = {
  formatPrice: (price: string | number, decimals: number = 2): string => {
    return parseFloat(price.toString()).toFixed(decimals);
  },

  formatVolume: (volume: string | number): string => {
    const num = parseFloat(volume.toString());
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  },

  formatMarketCap: (marketCap: string | number): string => {
    const num = parseFloat(marketCap.toString());
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toFixed(2);
  },

  formatPriceChange: (change: string | number): string => {
    const num = parseFloat(change.toString());
    const sign = num >= 0 ? "+" : "";
    return `${sign}${num}`;
  },

  formatPercentageChange: (change: string | number): string => {
    const num = parseFloat(change.toString());
    const sign = num >= 0 ? "+" : "";
    return `${sign}${num.toFixed(2)}%`;
  },

  // Convert size to display format
  formatSize: (size: string | number): string => {
    return parseFloat(size.toString()).toFixed(4);
  },

  // Format timestamp to time string
  formatTime: (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  },

  // Convert Hyperliquid candle data to TradingView format
  formatCandleData: (candles: any[]): any[] => {
    return candles.map((candle) => ({
      time: candle.t / 1000, // Convert to seconds
      open: parseFloat(candle.o),
      high: parseFloat(candle.h),
      low: parseFloat(candle.l),
      close: parseFloat(candle.c),
      volume: parseFloat(candle.v || "0"),
    }));
  },
};

type MarketKind = "perp" | "spot";

export function maxPriceDecimals(kind: MarketKind, szDecimals: number) {
  const MAX = kind === "spot" ? 8 : 6;
  return Math.max(0, MAX - szDecimals);
}

// enforce both the sig-fig and decimal-place rules, and strip trailing zeros for wire/signing
export function priceToWire(
  px: number | string,
  kind: MarketKind = "perp",
  szDecimals: number = 0,
): string {
  const n = typeof px === "string" ? Number(px) : px;
  if (!Number.isFinite(n)) throw new Error("Invalid price");

  const maxDec = maxPriceDecimals(kind, szDecimals);

  // Round to allowed decimal places first
  let s = n.toFixed(maxDec);

  // Remove trailing zeros & trailing dot
  s = s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");

  // Check significant figures (<=5) unless integer
  if (s.includes(".")) {
    const sig = s.replace(".", "").replace(/^0+/, "").length;
    if (sig > 5) {
      // re-round to keep 5 sig figs (but still not exceeding maxDec)
      const abs = Math.abs(n);
      const digits = Math.max(0, 5 - Math.floor(Math.log10(abs)) - 1);
      const dec = Math.min(digits, maxDec);
      s = n
        .toFixed(dec)
        .replace(/(\.\d*?[1-9])0+$/, "$1")
        .replace(/\.0+$/, "");
    }
  }

  return s;
}
