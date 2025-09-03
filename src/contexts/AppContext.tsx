"use client";

import { usePrefetchData } from "@/hooks/usePrefetchData";
import { useWebSocketSubscriptions } from "@/hooks/useWebSocketSubscriptions";
import { formatters } from "@/lib/utils";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import {
  AppDataContextType,
  Asset,
  BalanceData,
  MarketData,
  OpenOrder,
  OrderBookData,
  Position,
  Trade,
  TwapData,
} from "@/types";
import {
  FrontendOrder,
  OrderStatus,
  UserFundingUpdate,
} from "@nktkas/hyperliquid";
import { usePrivy } from "@privy-io/react-auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AppDataContext = createContext<AppDataContextType | null>(null);

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}

interface MarketDataProviderProps {
  children: ReactNode;
}

export function AppDataProvider({ children }: MarketDataProviderProps) {
  // WebSocket state (real-time)
  const [marketData, setMarketData] = useState<MarketData>({});
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);

  // HTTP state (historical/on-demand)
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [orderHistory, setOrderHistory] = useState<
    OrderStatus<FrontendOrder>[]
  >([]);
  const [fundingHistory, setFundingHistory] = useState<UserFundingUpdate[]>([]);
  const [twapData, setTwapData] = useState<TwapData | null>(null);

  const { prefetchAll } = usePrefetchData(selectedSymbol);
  const { user } = usePrivy();

  // Derived state: compute selectedAsset from selectedSymbol and availableAssets
  const selectedAsset = useMemo(() => {
    return (
      availableAssets.find((asset) => asset.name === selectedSymbol) || null
    );
  }, [selectedSymbol, availableAssets]);

  // Use consolidated WebSocket subscriptions hook
  useWebSocketSubscriptions({
    setMarketData,
    setIsConnected,
    setBalanceData,
    setPositions,
    setOpenOrders,
    setOrderBook,
    setRecentTrades,
    availableAssets,
    selectedSymbol,
    selectedAsset,
  });

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
        setAvailableAssets([]);
        setSelectedSymbol("");
        setMarketData({});
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

  // Prefetch data when user authentication state changes
  useEffect(() => {
    prefetchAll();
  }, [user, prefetchAll]);

  return (
    <AppDataContext.Provider
      value={{
        // Market data (WebSocket)
        marketData,
        orderBook,
        recentTrades,
        selectedSymbol,
        selectedAsset,
        setSelectedSymbol,
        isConnected,
        refreshData,
        availableAssets,

        // User data (WebSocket)
        balanceData,
        positions,
        openOrders,

        // Historical data (HTTP/useQuery)
        tradeHistory,
        orderHistory,
        fundingHistory,
        twapData,

        // State update methods for historical data
        setTradeHistory,
        setOrderHistory,
        setFundingHistory,
        setTwapData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

// Keep for backward compatibility during transition
export const MarketDataProvider = AppDataProvider;
