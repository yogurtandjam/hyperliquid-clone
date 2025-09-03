"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useAppData } from "@/contexts/AppContext";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { Address } from "viem";
import { OrderHistoryItem } from "@/types";

export function useOrderHistory() {
  const { user, authenticated } = usePrivy();
  const { orderHistory, setOrderHistory } = useAppData();
  const userAddress = user?.wallet?.address as Address;

  const query = useQuery({
    queryKey: ["orderHistory", userAddress],
    queryFn: async () => {
      if (!userAddress) {
        throw new Error("User address not available");
      }

      const rawOrderHistory = await hyperliquidApi.getUserOrderHistory(
        userAddress,
      );

      // Transform API response to OrderHistoryItem format
      const formattedHistory: OrderHistoryItem[] = Array.isArray(
        rawOrderHistory,
      )
        ? rawOrderHistory.map((order: any) => ({
            coin: order.coin,
            side: order.side === "A" ? "sell" : "buy",
            px: order.px,
            sz: order.sz,
            time: order.time,
            fee: order.fee || "0",
            closedPnl: order.closedPnl,
          }))
        : [];

      // Update context state
      setOrderHistory(formattedHistory);
      return formattedHistory;
    },
    enabled: authenticated && !!userAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Data considered fresh for 15 seconds
  });

  // Return data from context state, with query status
  return {
    ...query,
    data: orderHistory.length > 0 ? orderHistory : query.data,
  };
}
