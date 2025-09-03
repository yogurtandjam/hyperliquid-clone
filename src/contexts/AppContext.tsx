"use client";

import { useWebSocketSubscriptions } from "@/hooks/useWebSocketSubscriptions";
import { useInitialMarketData } from "@/hooks/useInitialMarketData";
import { useInitialOrderBook } from "@/hooks/useInitialOrderBook";
import { useInitialFundingHistory } from "@/hooks/useFundingHistory";
import { useInitialOrderHistory } from "@/hooks/useOrderHistory";
import { useInitialTradesData } from "@/hooks/useTradesData";
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

  // Derived state: compute selectedAsset from selectedSymbol and availableAssets
  const selectedAsset = useMemo(() => {
    return (
      availableAssets.find((asset) => asset.name === selectedSymbol) || null
    );
  }, [selectedSymbol, availableAssets]);

  // Use initial data hooks
  useInitialMarketData({
    setAvailableAssets,
    setSelectedSymbol,
    setMarketData,
    selectedSymbol,
  });

  useInitialOrderBook({
    selectedSymbol,
    setOrderBook,
  });

  // Use individual hooks with setter injection (no circular dependency)
  useInitialFundingHistory(7, setFundingHistory);
  useInitialOrderHistory(setOrderHistory);
  useInitialTradesData(setTradeHistory);

  // Use consolidated WebSocket subscriptions hook
  useWebSocketSubscriptions({
    setMarketData,
    setIsConnected,
    setBalanceData,
    setPositions,
    setOpenOrders,
    setOrderBook,
    setRecentTrades,
    setFundingHistory,
    setOrderHistory,
    availableAssets,
    selectedSymbol,
    selectedAsset,
  });

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
