"use client";

import { useEffect } from "react";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { formatters } from "@/lib/utils";
import { Asset, MarketData } from "@/types";

type UseInitialMarketDataProps = {
  setAvailableAssets: (assets: Asset[]) => void;
  setSelectedSymbol: (symbol: string) => void;
  setMarketData: (marketData: MarketData) => void;
  selectedSymbol: string;
};

export function useInitialMarketData({
  setAvailableAssets,
  setSelectedSymbol,
  setMarketData,
  selectedSymbol,
}: UseInitialMarketDataProps) {
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        console.log("🚀 Fetching initial data from Hyperliquid API...");

        // First, fetch meta data to get available perpetuals
        const metaData = await hyperliquidApi.getMeta();
        if (metaData && metaData.universe) {
          const perpetuals = metaData.universe.filter((asset) => asset.name); // Only perpetuals have names

          console.log(`✅ Found ${perpetuals.length} perpetuals`);
          setAvailableAssets(
            perpetuals.map((p, index) => ({
              ...p,
              index,
            })),
          );

          // Set default symbol to the first available perpetual (usually BTC)
          if (perpetuals.length > 0 && !selectedSymbol) {
            const defaultAsset =
              perpetuals.find((asset) => asset.name === "BTC") || perpetuals[0];
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
}
