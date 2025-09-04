"use client";

import { useEffect } from "react";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { formatters, ORDERBOOK_MAX_ROWS } from "@/lib/utils";
import { OrderBookData } from "@/types";

type UseInitialOrderBookProps = {
  selectedSymbol: string;
  setOrderBook: (orderBook: OrderBookData | null) => void;
};

export function useInitialOrderBook({
  selectedSymbol,
  setOrderBook,
}: UseInitialOrderBookProps) {
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
            .slice(0, ORDERBOOK_MAX_ROWS)
            .map((level) => {
              const price = Array.isArray(level) ? level[0] : level.px || "0";
              const size = Array.isArray(level) ? level[1] : level.sz || "0";
              return {
                price: price,
                size: size,
                total: size,
              };
            });

          const processedAsks = (Array.isArray(asks) ? asks : [])
            .slice(0, ORDERBOOK_MAX_ROWS)
            .map((level) => {
              const price = Array.isArray(level) ? level[0] : level.px || "0";
              const size = Array.isArray(level) ? level[1] : level.sz || "0";
              return {
                price: price,
                size: size,
                total: size,
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
  }, [selectedSymbol, setOrderBook]);
}
