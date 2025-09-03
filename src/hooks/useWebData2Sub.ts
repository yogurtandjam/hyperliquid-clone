import { useEffect } from "react";
import { subscriptionClient } from "@/services/hyperliquidApi";
import type { Subscription } from "@nktkas/hyperliquid";
import { usePrivy } from "@privy-io/react-auth";

// tiny helpers
const num = (v: unknown) =>
  v == null ? undefined : Number.isFinite(+v as number) ? +v : undefined;

const fmtUsd2 = (n?: number) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);

type MarketDataSetter = React.Dispatch<
  React.SetStateAction<{
    [symbol: string]: {
      price: string;
      change24h: string;
      changePercent24h: string;
      volume24h: string;
      lastUpdate: number;
    };
  }>
>;

export function useWebData2Subscription(opts: {
  availableAssets: Array<{ name: string }>;
  setMarketData: MarketDataSetter;
  setIsConnected: (b: boolean) => void;
  subscriptionsRef: React.MutableRefObject<
    {
      webData2?: Subscription;
    } & Record<string, any>
  >;
}) {
  const { user } = usePrivy();
  const { availableAssets, setMarketData, setIsConnected, subscriptionsRef } =
    opts;

  useEffect(() => {
    // need the mapping from index -> symbol
    if (!availableAssets.length) return;

    const namesByIdx = availableAssets.map((a) => a.name);

    (async () => {
      try {
        // unsubscribe previous if any
        if (subscriptionsRef.current.webData2) {
          await subscriptionsRef.current.webData2.unsubscribe();
        }

        subscriptionsRef.current.webData2 = await subscriptionClient.webData2(
          { user: user?.wallet?.address },
          (payload: any) => {
            const arr = payload?.assetCtxs;
            if (!Array.isArray(arr)) return;

            // we'll add universe syncing later — for now, refuse to mislabel
            if (arr.length !== namesByIdx.length) {
              // console.warn('webData2 len mismatch; skipping tick', arr.length, namesByIdx.length);
              return;
            }

            setMarketData((prev) => {
              const next = { ...prev };

              for (let i = 0; i < arr.length; i++) {
                const symbol = namesByIdx[i];
                const ctx = arr[i] ?? {};

                // normalize numbers from strings
                const prevDayPx = num(ctx.prevDayPx);
                const mark =
                  num(ctx.markPx) ??
                  num(ctx.midPx) ??
                  num(ctx.oraclePx) ??
                  undefined;
                const volUsd =
                  num(ctx.dayNtlVlm) ?? num(ctx.volume24hUsd) ?? undefined;

                // compute 24h change from prevDayPx + current mark
                const abs =
                  mark != null && prevDayPx != null ? mark - prevDayPx : 0;
                const pct =
                  prevDayPx != null && prevDayPx !== 0
                    ? (abs / prevDayPx) * 100
                    : 0;

                const prevRow = next[symbol] ?? {
                  price: mark != null ? String(mark) : "0",
                  change24h: "0.000",
                  changePercent24h: "0.00%",
                  volume24h: "0",
                  lastUpdate: 0,
                };

                next[symbol] = {
                  // keep price from allMids if you want; otherwise update here too
                  price:
                    mark != null ? mark.toLocaleString("en-US") : prevRow.price,
                  change24h:
                    prevDayPx != null && mark != null
                      ? (abs >= 0 ? "+" : "") + abs.toLocaleString("en-US")
                      : prevRow.change24h,
                  changePercent24h:
                    prevDayPx != null && mark != null
                      ? `${pct >= 0 ? "+" : ""}${Math.abs(pct).toFixed(2)}%`
                      : prevRow.changePercent24h,
                  volume24h:
                    volUsd != null ? fmtUsd2(volUsd) : prevRow.volume24h,
                  lastUpdate: Date.now(),
                };
              }
              return next;
            });

            setIsConnected(true);
          },
        );
      } catch (e) {
        // console.error('webData2 subscribe error', e);
        setIsConnected(false);
      }
    })();

    return () => {
      if (subscriptionsRef.current.webData2) {
        subscriptionsRef.current.webData2.unsubscribe();
      }
    };
  }, [availableAssets, setMarketData, setIsConnected, subscriptionsRef]);
}
