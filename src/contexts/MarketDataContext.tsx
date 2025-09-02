"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { hyperliquidApi, subscriptionClient } from "@/services/hyperliquidApi";
import { formatters, formatToMatch, priceToWire } from "@/lib/utils";
import { usePrivy } from "@privy-io/react-auth";
import { Address } from "viem";
import { Subscription } from "@nktkas/hyperliquid";
import { useWebData2Subscription } from "@/hooks/useWebData2Sub";

interface MarketData {
  [symbol: string]: {
    price: string;
    change24h: string;
    changePercent24h: string;
    volume24h: string;
    lastUpdate: number;
  };
}

interface OrderBookData {
  symbol: string;
  bids: Array<{ price: string; size: string; total: string }>;
  asks: Array<{ price: string; size: string; total: string }>;
  spread: { absolute: string; percentage: string };
  lastUpdate: number;
}

interface Trade {
  symbol: string;
  price: string;
  size: string;
  side: "buy" | "sell";
  timestamp: number;
  txHash?: string;
}

interface Asset {
  name: string;
  szDecimals: number;
  [key: string]: any;
}

interface MarketDataContextType {
  marketData: MarketData;
  orderBook: OrderBookData | null;
  recentTrades: Trade[];
  selectedSymbol: string;
  selectedAsset: Asset | null;
  setSelectedSymbol: (symbol: string) => void;
  isConnected: boolean;
  refreshData: () => void;
  availableAssets: Asset[];
}

const MarketDataContext = createContext<MarketDataContextType | null>(null);

export function useMarketData() {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error("useMarketData must be used within a MarketDataProvider");
  }
  return context;
}

interface MarketDataProviderProps {
  children: ReactNode;
}

export function MarketDataProvider({ children }: MarketDataProviderProps) {
  const [marketData, setMarketData] = useState<MarketData>({});
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Derived state: compute selectedAsset from selectedSymbol and availableAssets
  const selectedAsset = useMemo(() => {
    return (
      availableAssets.find((asset) => asset.name === selectedSymbol) || null
    );
  }, [selectedSymbol, availableAssets]);

  // WebSocket subscriptions references
  const subscriptionsRef = React.useRef<{
    allMids?: Subscription;
    l2Book?: Subscription;
    trades?: Subscription;
    webData2?: Subscription;
  }>({});

  // TODO: do this later for faster/better price updates on all assets. for now we can use the webdata2 sub
  // Subscribe to all mids (prices) for all assets
  // useEffect(() => {
  //   const setupAllMidsSubscription = async () => {
  //     try {
  //       console.log("🔗 Setting up allMids subscription...");

  //       subscriptionsRef.current.allMids = await subscriptionClient.allMids(
  //         (data) => {
  //           console.log(
  //             "📊 AllMids update:",
  //             Object.keys(data.mids).length,
  //             "assets",
  //           );

  //           setMarketData((prev) => {
  //             const updatedMarketData: MarketData = { ...prev };
  //             console.log(prev);
  //             Object.entries(data).forEach(([symbol, price]) => {
  //               if (!updatedMarketData[symbol]) updatedMarketData[symbol] = {};
  //               updatedMarketData[symbol].price = String(price);
  //             });
  //             return updatedMarketData;
  //           });

  //           setIsConnected(true);
  //         },
  //       );

  //       console.log("✅ AllMids subscription established");
  //     } catch (error) {
  //       console.error("❌ Error setting up allMids subscription:", error);
  //       setIsConnected(false);
  //     }
  //   };

  //   setupAllMidsSubscription();

  //   return () => {
  //     if (subscriptionsRef.current.allMids) {
  //       subscriptionsRef.current.allMids.unsubscribe();
  //     }
  //   };
  // }, []);

  // Subscribe to L2 book and trades for selected symbol
  useEffect(() => {
    const setupSymbolSubscriptions = async () => {
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
            // console.log(`📖 L2Book update for ${selectedSymbol}:`, data);

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

              // Process bids and asks with running totals - ensure arrays exist
              const processedBids = (Array.isArray(bids) ? bids : [])
                .slice(0, 15)
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
                    total: runningTotal,
                  };
                });

              const processedAsks = (Array.isArray(asks) ? asks : [])
                .slice(0, 15)
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
                    total: runningTotal.toFixed(selectedAsset?.szDecimals),
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
                lastUpdate: Date.now(),
              });
            }
          },
        );

        // Subscribe to trades
        subscriptionsRef.current.trades = await subscriptionClient.trades(
          { coin: selectedSymbol },
          (data) => {
            // console.log(`💹 Trades update for ${selectedSymbol}:`, data);

            if (data && Array.isArray(data)) {
              const newTrades: Trade[] = data.map((trade) => ({
                symbol: selectedSymbol,
                price: trade.px,
                size: trade.sz,
                side: trade.side === "A" ? "sell" : "buy", // A = Ask (sell), B = Bid (buy)
                timestamp: trade.time,
                txHash: trade.hash,
              }));
              setRecentTrades((prev) => [...newTrades, ...prev].slice(0, 50)); // Keep last 50 trades
            }
          },
        );

        // console.log(`✅ Subscriptions established for ${selectedSymbol}`);
      } catch (error) {
        console.error(
          `❌ Error setting up subscriptions for ${selectedSymbol}:`,
          error,
        );
      }
    };

    setupSymbolSubscriptions();

    return () => {
      if (subscriptionsRef.current.l2Book) {
        subscriptionsRef.current.l2Book.unsubscribe();
      }
      if (subscriptionsRef.current.trades) {
        subscriptionsRef.current.trades.unsubscribe();
      }
    };
  }, [selectedSymbol]);

  // Initial data fetch from real API
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        console.log("🚀 Fetching initial data from Hyperliquid API...");

        // First, fetch meta data to get available perpetuals
        const metaData = await hyperliquidApi.getMeta();
        if (metaData && metaData.universe) {
          const perpetuals = metaData.universe.filter((asset) => asset.name); // Only perpetuals have names

          console.log(
            `✅ Found ${perpetuals.length} perpetuals:`,
            perpetuals.slice(0, 10).map((asset) => asset.name),
          );
          setAvailableAssets(perpetuals);

          // Set default symbol to the first available perpetual (usually BTC)
          if (perpetuals.length > 0 && !selectedSymbol) {
            const defaultAsset =
              perpetuals.find((asset: Asset) => asset.name === "BTC") ||
              perpetuals[0];
            setSelectedSymbol(defaultAsset.name);
          }
        }

        // Fetch current prices for all perpetuals
        const midsData = await hyperliquidApi.getAllMids();
        if (midsData) {
          console.log(
            `✅ Loaded prices for ${Object.keys(midsData).length} assets`,
          );

          const initialMarketData: MarketData = {};
          Object.entries(midsData).forEach(([symbol, price]) => {
            initialMarketData[symbol] = {
              price: formatters.formatPrice(price as string),
              change24h: "0.000",
              changePercent24h: "0.00%",
              volume24h: "0",
            };
          });
          setMarketData(initialMarketData);
        }
        console.log("✅ Initial data loaded successfully");
      } catch (error) {
        console.error("❌ Error fetching initial data:", error);
        // Fall back to popular assets if API fails
        const fallbackAssets = [
          { name: "BTC", szDecimals: 4 },
          { name: "ETH", szDecimals: 4 },
          { name: "SOL", szDecimals: 4 },
          { name: "ARB", szDecimals: 4 },
        ];
        setAvailableAssets(fallbackAssets);
        setSelectedSymbol("BTC");
        setMarketData({
          BTC: {
            price: "0.000",
            change24h: "0.000",
            changePercent24h: "0.00%",
            volume24h: "0",
            lastUpdate: Date.now(),
          },
        });
      }
    };

    fetchInitialData();
  }, []); // Remove selectedSymbol dependency to avoid loop

  // Separate effect for order book when symbol changes
  useEffect(() => {
    const fetchOrderBook = async () => {
      if (!selectedSymbol) return;

      try {
        const orderBookData = await hyperliquidApi.getL2Book(selectedSymbol);
        if (orderBookData?.levels) {
          console.log(`✅ Loaded order book for ${selectedSymbol}`);

          const { levels } = orderBookData;
          const bids = levels[0] || [];
          const asks = levels[1] || [];

          const processedBids = (Array.isArray(bids) ? bids : [])
            .slice(0, 15)
            .map((level) => {
              const price = Array.isArray(level) ? level[0] : level.px || "0";
              const size = Array.isArray(level) ? level[1] : level.sz || "0";
              return {
                price: formatters.formatPrice(price),
                size: formatters.formatSize(size),
                total: formatters.formatSize(size),
              };
            });

          const processedAsks = (Array.isArray(asks) ? asks : [])
            .slice(0, 15)
            .map((level) => {
              const price = Array.isArray(level) ? level[0] : level.px || "0";
              const size = Array.isArray(level) ? level[1] : level.sz || "0";
              return {
                price: formatters.formatPrice(price),
                size: formatters.formatSize(size),
                total: formatters.formatSize(size),
              };
            });

          setOrderBook({
            symbol: selectedSymbol,
            bids: processedBids,
            asks: processedAsks,
            spread: { absolute: "0.000", percentage: "0.000%" },
            lastUpdate: Date.now(),
          });
        }
      } catch (error) {
        console.error(
          `❌ Error fetching order book for ${selectedSymbol}:`,
          error,
        );
      }
    };

    fetchOrderBook();
  }, [selectedSymbol]);

  const refreshData = async () => {
    try {
      console.log("🔄 Refreshing market data...");
      const midsData = await hyperliquidApi.getAllMids();
      if (midsData) {
        setMarketData((prev) => {
          const updatedMarketData: MarketData = {};
          Object.entries(midsData).forEach(([symbol, price]) => {
            const prevData = prev[symbol];
            updatedMarketData[symbol] = {
              ...prevData,
              price: formatters.formatPrice(price as string),
              lastUpdate: Date.now(),
            };
          });
          return { ...prev, ...updatedMarketData };
        });
        console.log("✅ Market data refreshed");
      }
    } catch (error) {
      console.error("❌ Error refreshing data:", error);
    }
  };

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      Object.values(subscriptionsRef.current).forEach((subscription) => {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      });
    };
  }, []);

  useWebData2Subscription({
    availableAssets,
    setMarketData,
    setIsConnected,
    subscriptionsRef,
  });

  return (
    <MarketDataContext.Provider
      value={{
        marketData,
        orderBook,
        recentTrades,
        selectedSymbol,
        selectedAsset,
        setSelectedSymbol,
        isConnected,
        refreshData,
        availableAssets,
      }}
    >
      {children}
    </MarketDataContext.Provider>
  );
}
