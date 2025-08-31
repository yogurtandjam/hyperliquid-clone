"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  formatters,
  hyperliquidApi,
  subscriptionClient,
} from "@/services/hyperliquidApi";
import { usePrivy } from "@privy-io/react-auth";
import { Address } from "viem";

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

interface MarketDataContextType {
  marketData: MarketData;
  orderBook: OrderBookData | null;
  recentTrades: Trade[];
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  isConnected: boolean;
  refreshData: () => void;
  availableAssets: string[];
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
  const { user } = usePrivy();
  const [marketData, setMarketData] = useState<MarketData>({});
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [availableAssets, setAvailableAssets] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket subscriptions references
  const subscriptionsRef = React.useRef<{
    allMids?: any;
    l2Book?: any;
    trades?: any;
  }>({});

  // Subscribe to all mids (prices) for all assets
  useEffect(() => {
    const setupAllMidsSubscription = async () => {
      try {
        console.log("🔗 Setting up allMids subscription...");

        subscriptionsRef.current.allMids = await subscriptionClient.allMids(
          (data) => {
            console.log(
              "📊 AllMids update:",
              Object.keys(data).length,
              "assets",
            );

            setMarketData((prev) => {
              const updatedMarketData: MarketData = {};
              Object.entries(data).forEach(([symbol, price]) => {
                const currentPrice = parseFloat(price as string);
                const prevData = prev[symbol];
                const change24h = prevData
                  ? (currentPrice - parseFloat(prevData.price)).toFixed(3)
                  : "0.000";
                const changePercent =
                  prevData && parseFloat(prevData.price) > 0
                    ? (
                        ((currentPrice - parseFloat(prevData.price)) /
                          parseFloat(prevData.price)) *
                        100
                      ).toFixed(2)
                    : "0.00";

                updatedMarketData[symbol] = {
                  price: formatters.formatPrice(price as string),
                  change24h: formatters.formatPriceChange(change24h),
                  changePercent24h: `${changePercent}%`,
                  volume24h: prevData?.volume24h || "0",
                  lastUpdate: Date.now(),
                };
              });
              return { ...prev, ...updatedMarketData };
            });

            setIsConnected(true);
          },
        );

        console.log("✅ AllMids subscription established");
      } catch (error) {
        console.error("❌ Error setting up allMids subscription:", error);
        setIsConnected(false);
      }
    };

    setupAllMidsSubscription();

    return () => {
      if (subscriptionsRef.current.allMids) {
        subscriptionsRef.current.allMids.unsubscribe();
      }
    };
  }, []);

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
              const bestBid = bids[0]?.[0] || "0";
              const bestAsk = asks[0]?.[0] || "0";
              const spreadAbs = (
                parseFloat(bestAsk) - parseFloat(bestBid)
              ).toFixed(3);
              const spreadPerc =
                parseFloat(bestBid) > 0
                  ? (
                      ((parseFloat(bestAsk) - parseFloat(bestBid)) /
                        parseFloat(bestBid)) *
                      100
                    ).toFixed(3)
                  : "0";

              // Process bids and asks with running totals - ensure arrays exist
              const processedBids = (Array.isArray(bids) ? bids : [])
                .slice(0, 15)
                .map((level: any, index: number) => {
                  const price = Array.isArray(level)
                    ? level[0]
                    : level.px || level.price || "0";
                  const size = Array.isArray(level)
                    ? level[1]
                    : level.sz || level.size || "0";

                  const runningTotal = (Array.isArray(bids) ? bids : [])
                    .slice(0, index + 1)
                    .reduce((sum: number, lvl: any) => {
                      const levelSize = Array.isArray(lvl)
                        ? lvl[1]
                        : lvl.sz || lvl.size || "0";
                      return sum + parseFloat(levelSize);
                    }, 0);
                  return {
                    price: formatters.formatPrice(price),
                    size: formatters.formatSize(size),
                    total: formatters.formatSize(runningTotal.toString()),
                  };
                });

              const processedAsks = (Array.isArray(asks) ? asks : [])
                .slice(0, 15)
                .map((level: any, index: number) => {
                  const price = Array.isArray(level)
                    ? level[0]
                    : level.px || level.price || "0";
                  const size = Array.isArray(level)
                    ? level[1]
                    : level.sz || level.size || "0";

                  const runningTotal = (Array.isArray(asks) ? asks : [])
                    .slice(0, index + 1)
                    .reduce((sum: number, lvl: any) => {
                      const levelSize = Array.isArray(lvl)
                        ? lvl[1]
                        : lvl.sz || lvl.size || "0";
                      return sum + parseFloat(levelSize);
                    }, 0);
                  return {
                    price: formatters.formatPrice(price),
                    size: formatters.formatSize(size),
                    total: formatters.formatSize(runningTotal.toString()),
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
                price: formatters.formatPrice(trade.px),
                size: formatters.formatSize(trade.sz),
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
          const perpetuals = metaData.universe
            .filter((asset: any) => asset.name) // Only perpetuals have names
            .map((asset: any) => asset.name);

          console.log(
            `✅ Found ${perpetuals.length} perpetuals:`,
            perpetuals.slice(0, 10),
          );
          setAvailableAssets(perpetuals);

          // Set default symbol to the first available perpetual (usually BTC)
          if (perpetuals.length > 0 && !selectedSymbol) {
            const defaultSymbol =
              perpetuals.find((symbol: string) => symbol === "BTC") ||
              perpetuals[0];
            setSelectedSymbol(defaultSymbol);
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
              lastUpdate: Date.now(),
            };
          });
          setMarketData(initialMarketData);
        }
        console.log("✅ Initial data loaded successfully");
      } catch (error) {
        console.error("❌ Error fetching initial data:", error);
        // Fall back to popular assets if API fails
        setAvailableAssets(["BTC", "ETH", "SOL", "ARB"]);
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
            .map((level: any) => {
              const price = Array.isArray(level)
                ? level[0]
                : level.px || level.price || "0";
              const size = Array.isArray(level)
                ? level[1]
                : level.sz || level.size || "0";
              return {
                price: formatters.formatPrice(price),
                size: formatters.formatSize(size),
                total: formatters.formatSize(size),
              };
            });

          const processedAsks = (Array.isArray(asks) ? asks : [])
            .slice(0, 15)
            .map((level: any) => {
              const price = Array.isArray(level)
                ? level[0]
                : level.px || level.price || "0";
              const size = Array.isArray(level)
                ? level[1]
                : level.sz || level.size || "0";
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
            spread: { absolute: "0.001", percentage: "0.002%" },
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

  return (
    <MarketDataContext.Provider
      value={{
        marketData,
        orderBook,
        recentTrades,
        selectedSymbol,
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
