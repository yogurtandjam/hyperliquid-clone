"use client";

import React, { useEffect } from "react";
import { subscriptionClient } from "@/services/hyperliquidApi";
import type {
  FrontendOrder,
  OrderStatus,
  Subscription,
  UserFundingUpdate,
} from "@nktkas/hyperliquid";
import { usePrivy } from "@privy-io/react-auth";
import { Address } from "viem";
import {
  formatters,
  isTruthy,
  mapTradeHistory,
  ORDERBOOK_MAX_ROWS,
  priceToWire,
  toNumSafe,
} from "@/lib/utils";
import {
  Asset,
  MarketData,
  BalanceData,
  Position,
  OpenOrder,
  Trade,
  OrderBookData,
} from "@/types";

const fmtUsd2 = (n?: number) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);

type WebSocketSubscriptionsProps = {
  // State setters
  setMarketData: React.Dispatch<React.SetStateAction<MarketData>>;
  setIsConnected: (connected: boolean) => void;
  setBalanceData: React.Dispatch<React.SetStateAction<BalanceData | null>>;
  setPositions: React.Dispatch<React.SetStateAction<Position[]>>;
  setOpenOrders: React.Dispatch<React.SetStateAction<OpenOrder[]>>;
  setOrderBook: React.Dispatch<React.SetStateAction<OrderBookData | null>>;
  setRecentTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  setTradeHistory: React.Dispatch<React.SetStateAction<Trade[]>>;
  setFundingHistory: (fundingHistory: UserFundingUpdate[]) => void;
  setOrderHistory: (orderHistory: OrderStatus<FrontendOrder>[]) => void;

  // Data dependencies
  availableAssets: Asset[];
  selectedSymbol: string;
  selectedAsset: Asset | null;
  assetsMap: { [k: string]: Asset };
};

export function useWebSocketSubscriptions(props: WebSocketSubscriptionsProps) {
  const { user, ready } = usePrivy();
  const {
    setMarketData,
    setIsConnected,
    setBalanceData,
    setPositions,
    setOpenOrders,
    setOrderBook,
    setRecentTrades,
    setTradeHistory,
    setFundingHistory,
    setOrderHistory,
    availableAssets,
    selectedSymbol,
    selectedAsset,
    assetsMap,
  } = props;

  // Create assetsMap from availableAssets

  // Subscription refs
  const subscriptionsRef = React.useRef<{
    webData2?: Subscription;
    l2Book?: Subscription;
    trades?: Subscription;
    fundingHistory?: Subscription;
    tradeHistory?: Subscription;
  }>({});

  // WebData2 subscription (user account data + market data)
  useEffect(() => {
    if (!ready || !availableAssets.length) return;

    const namesByIdx = availableAssets.map((a) => a.name);

    const setupWebData2Subscription = async () => {
      try {
        // Unsubscribe from previous webData2 subscription
        if (subscriptionsRef.current.webData2) {
          console.log("Unsubscribing from previous webData2 subscription");
          await subscriptionsRef.current.webData2.unsubscribe();
          subscriptionsRef.current.webData2 = undefined;
        }

        console.log(
          "Creating new webData2 subscription for user:",
          user?.wallet?.address,
        );

        subscriptionsRef.current.webData2 = await subscriptionClient.webData2(
          {
            user: (user?.wallet?.address ??
              "0x0000000000000000000000000000000000000000") as Address,
          },
          (payload) => {
            // Extract clearinghouseState for balance data
            const clearingHouse = payload?.clearinghouseState;
            if (clearingHouse) {
              const {
                accountValue,
                totalMarginUsed,
                totalNtlPos,
                totalRawUsd,
              } = clearingHouse.marginSummary;
              const availableBalance = (
                parseFloat(accountValue) - parseFloat(totalMarginUsed)
              ).toFixed(2);

              setBalanceData({
                accountValue: accountValue || "0",
                availableBalance,
                marginUsed: totalMarginUsed || "0",
                withdrawable: clearingHouse.withdrawable || "0",
                crossMaintenanceMarginUsed:
                  clearingHouse.crossMaintenanceMarginUsed,
                totalNtlPos: totalNtlPos,
                totalRawUsd: totalRawUsd,
                unrealizedPnl:
                  clearingHouse.assetPositions?.reduce((total, nextAsset) => {
                    const pnl =
                      toNumSafe(nextAsset.position?.unrealizedPnl) || 0;
                    return total + pnl;
                  }, 0) || 0,
              });

              // Extract positions data
              const positions =
                clearingHouse.assetPositions
                  ?.map((assetPos) => {
                    const position = assetPos.position;
                    const szDecimals =
                      assetsMap[position.coin]?.szDecimals || 0;

                    // Skip positions with no size
                    if (!position.szi || toNumSafe(position.szi) === 0)
                      return null;

                    return {
                      coin: position.coin,
                      szi: priceToWire(position.szi, "perp", szDecimals),
                      entryPx: priceToWire(
                        position.entryPx,
                        "perp",
                        szDecimals,
                      ),
                      unrealizedPnl: formatters.formatPriceChange(
                        position.unrealizedPnl,
                      ),
                      liquidationPrice: priceToWire(
                        position.liquidationPx ?? 0,
                        "perp",
                        szDecimals,
                      ),
                      leverage: `${position.leverage.value}x`,
                      marginUsed: position.marginUsed,
                      positionValue: position.positionValue,
                      returnOnEquity: formatters.formatPercentageChange(
                        toNumSafe(position.returnOnEquity),
                      ),
                    };
                  })
                  .filter(isTruthy) ?? [];

              setPositions(positions);
            }

            // Extract open orders from payload
            const openOrders = payload?.openOrders || [];
            const mappedOrders = openOrders.map((order) => {
              const szDecimals = assetsMap[order.coin]?.szDecimals || 0;
              return {
                coin: order.coin,
                side: order.side === "A" ? ("sell" as const) : ("buy" as const),
                orderType: order.orderType,
                sz: priceToWire(order.sz, "perp", szDecimals),
                px: priceToWire(order.limitPx, "perp", szDecimals),
                filled: (
                  toNumSafe(order.origSz) - toNumSafe(order.sz)
                )?.toString(),
                timestamp: order.timestamp,
                oid: order.oid,
                origSz: priceToWire(order.origSz, "perp", szDecimals),
                reduceOnly: order.reduceOnly,
              };
            });
            setOpenOrders(mappedOrders);

            // Handle market data
            const arr = payload?.assetCtxs;
            if (!Array.isArray(arr)) return;

            if (arr.length !== namesByIdx.length) {
              console.warn(
                "webData2 len mismatch; skipping tick",
                arr.length,
                namesByIdx.length,
              );
              return;
            }

            setMarketData((prev) => {
              const next = { ...prev };

              for (let i = 0; i < arr.length; i++) {
                const symbol = namesByIdx[i];
                const ctx = arr[i] ?? {};

                const prevDayPx = toNumSafe(ctx.prevDayPx);
                const mark = toNumSafe(ctx.markPx);
                const volUsd = toNumSafe(ctx.dayNtlVlm);

                const abs =
                  mark != null && prevDayPx != null ? mark - prevDayPx : 0;
                const pct =
                  prevDayPx != null && prevDayPx !== 0
                    ? (abs / prevDayPx) * 100
                    : 0;
                const prevRow = next[symbol] ?? {
                  price: ctx.markPx,
                  change24h: "0.000",
                  changePercent24h: "0.00%",
                  volume24h: "0",
                };

                next[symbol] = {
                  price: ctx.markPx,
                  change24h:
                    prevDayPx != null && mark != null
                      ? (abs >= 0 ? "+" : "") + abs
                      : prevRow.change24h,
                  changePercent24h:
                    prevDayPx != null && mark != null
                      ? `${pct >= 0 ? "+" : ""}${Math.abs(pct).toFixed(2)}%`
                      : prevRow.changePercent24h,
                  volume24h:
                    volUsd != null ? fmtUsd2(volUsd) : prevRow.volume24h,
                };
              }
              return next;
            });

            setIsConnected(true);
          },
        );

        console.log("webData2 subscription established successfully");
      } catch (e) {
        console.error("webData2 subscribe error", e);
        setIsConnected(false);
        subscriptionsRef.current.webData2 = undefined;
      }
    };

    setupWebData2Subscription();

    return () => {
      if (subscriptionsRef.current.webData2) {
        console.log("Cleaning up webData2 subscription");
        subscriptionsRef.current.webData2.unsubscribe().catch((error) => {
          console.error("Error unsubscribing from webData2:", error);
        });
        subscriptionsRef.current.webData2 = undefined;
      }
    };
  }, [
    ready,
    availableAssets,
    setMarketData,
    setIsConnected,
    setBalanceData,
    setPositions,
    setOpenOrders,
    user?.wallet?.address,
    assetsMap,
  ]);

  // L2 Book and Trades subscriptions for selected symbol
  useEffect(() => {
    const setupSelectedSymbolSubscriptions = async () => {
      if (!selectedSymbol) return;

      try {
        console.log(`🔗 Setting up subscriptions for ${selectedSymbol}...`);

        // Unsubscribe from previous symbol
        if (subscriptionsRef.current.l2Book) {
          await subscriptionsRef.current.l2Book.unsubscribe();
        }
        if (subscriptionsRef.current.trades) {
          await subscriptionsRef.current.trades.unsubscribe();
        }

        // Subscribe to L2 book
        subscriptionsRef.current.l2Book = await subscriptionClient.l2Book(
          { coin: selectedSymbol },
          (data) => {
            if (data && data.levels) {
              const { levels } = data;
              const bids = levels[0] || [];
              const asks = levels[1] || [];

              // Calculate spread
              const bestBid = bids[0]?.px || "0";
              const bestAsk = asks[0]?.px || "0";
              const spreadAbs = priceToWire(
                parseFloat(bestAsk) - parseFloat(bestBid),
                "perp",
                selectedAsset?.szDecimals,
              );
              const spreadPerc =
                parseFloat(bestBid) > 0
                  ? (
                      ((parseFloat(bestAsk) - parseFloat(bestBid)) /
                        parseFloat(bestBid)) *
                      100
                    ).toFixed(4)
                  : "0";

              // Process bids and asks with running totals
              const processedBids = (Array.isArray(bids) ? bids : [])
                .slice(0, ORDERBOOK_MAX_ROWS)
                .map((level, index: number) => {
                  const price = level.px || "0";
                  const size = level.sz || "0";

                  const runningTotal = (Array.isArray(bids) ? bids : [])
                    .slice(0, index + 1)
                    .reduce((sum: number, lvl) => {
                      const levelSize = lvl.sz || "0";
                      return sum + parseFloat(levelSize);
                    }, 0);

                  return {
                    price: price,
                    size: size,
                    total: runningTotal.toString(),
                  };
                });
              const processedAsks = (Array.isArray(asks) ? asks : [])
                .slice(0, ORDERBOOK_MAX_ROWS)
                .map((level, index: number) => {
                  const price = Array.isArray(level)
                    ? level[0]
                    : level.px || "0";
                  const size = Array.isArray(level)
                    ? level[1]
                    : level.sz || "0";

                  const runningTotal = (Array.isArray(asks) ? asks : [])
                    .slice(0, index + 1)
                    .reduce((sum: number, lvl) => {
                      const levelSize = Array.isArray(lvl)
                        ? lvl[1]
                        : lvl.sz || "0";
                      return sum + parseFloat(levelSize);
                    }, 0);

                  return {
                    price,
                    size,
                    total: priceToWire(
                      runningTotal,
                      "perp",
                      selectedAsset?.szDecimals,
                    ),
                  };
                });

              setOrderBook({
                symbol: selectedSymbol,
                bids: processedBids,
                asks: processedAsks,
                spread: {
                  absolute: spreadAbs,
                  percentage: `${spreadPerc}%`,
                },
              });
            }
          },
        );

        // Subscribe to trades
        subscriptionsRef.current.trades = await subscriptionClient.trades(
          { coin: selectedSymbol },
          (data) => {
            if (data && Array.isArray(data)) {
              const newTrades: Trade[] = data.map((trade) => ({
                coin: selectedSymbol,
                price: trade.px,
                size: trade.sz,
                side: trade.side === "A" ? "sell" : "buy", // A = Ask (sell), B = Bid (buy)
                time: trade.time,
                txHash: trade.hash,
              }));
              setRecentTrades((prev) => [...newTrades, ...prev].slice(0, 50)); // Keep last 50 trades
            }
          },
        );

        console.log(`✅ Subscriptions established for ${selectedSymbol}`);
      } catch (error) {
        console.error(
          `❌ Error setting up subscriptions for ${selectedSymbol}:`,
          error,
        );
      }
    };

    setupSelectedSymbolSubscriptions();

    return () => {
      if (subscriptionsRef.current.l2Book) {
        subscriptionsRef.current.l2Book.unsubscribe();
      }
      if (subscriptionsRef.current.trades) {
        subscriptionsRef.current.trades.unsubscribe();
      }
    };
  }, [
    selectedSymbol,
    selectedAsset?.szDecimals,
    setOrderBook,
    setRecentTrades,
  ]);

  // Funding History subscription
  useEffect(() => {
    const setupFundingHistorySubscription = async () => {
      if (!user?.wallet?.address) return;

      try {
        console.log("🔗 Setting up funding history subscription...");

        // Unsubscribe from previous subscription
        if (subscriptionsRef.current.fundingHistory) {
          await subscriptionsRef.current.fundingHistory.unsubscribe();
        }

        // Subscribe to user funding updates
        subscriptionsRef.current.fundingHistory =
          await subscriptionClient.userFundings(
            {
              user: user.wallet.address as Address,
            },
            (fundingData) => {
              if (fundingData && Array.isArray(fundingData)) {
                console.log("📊 Received funding update:", fundingData);

                // Sort by time descending (newest first)
                const sortedFunding = fundingData.sort(
                  (a, b) => b.time - a.time,
                );

                // Update funding history state
                setFundingHistory(sortedFunding);
              }
            },
          );

        console.log("✅ Funding history subscription established");
      } catch (error) {
        console.error("❌ Error setting up funding subscription:", error);
      }
    };

    if (user?.wallet?.address) {
      setupFundingHistorySubscription();
    }

    return () => {
      if (subscriptionsRef.current.fundingHistory) {
        subscriptionsRef.current.fundingHistory.unsubscribe();
      }
    };
  }, [user?.wallet?.address, setFundingHistory]);

  // Order History subscription
  useEffect(() => {
    const setupTradeHistorySubscription = async () => {
      if (!user?.wallet?.address) return;

      try {
        console.log("🔗 Setting up order history subscription...");

        // Unsubscribe from previous subscription
        if (subscriptionsRef.current.tradeHistory) {
          await subscriptionsRef.current.tradeHistory.unsubscribe();
        }

        // Subscribe to user fills updates (for real-time order fills)
        subscriptionsRef.current.tradeHistory =
          await subscriptionClient.userFills(
            {
              user: user.wallet.address as Address,
            },
            (fillsData) => {
              if (fillsData && Array.isArray(fillsData)) {
                console.log("📊 Received order fills update:", fillsData);

                // Update order history state with fills data
                setTradeHistory(fillsData.map(mapTradeHistory));
              }
            },
          );

        console.log("✅ Order history subscription established");
      } catch (error) {
        console.error("❌ Error setting up order history subscription:", error);
      }
    };

    if (user?.wallet?.address) {
      setupTradeHistorySubscription();
    }

    return () => {
      if (subscriptionsRef.current.tradeHistory) {
        subscriptionsRef.current.tradeHistory.unsubscribe();
      }
    };
  }, [user?.wallet?.address, setOrderHistory]);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      Object.values(subscriptionsRef.current).forEach((subscription) => {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      });
    };
  }, []);
}
