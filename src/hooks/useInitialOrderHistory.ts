"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { Address } from "viem";
import { QueryKeys } from "@/types";
import { FrontendOrder, OrderStatus } from "@nktkas/hyperliquid";

export function useInitialOrderHistory(
  setOrderHistory: (orderHistory: OrderStatus<FrontendOrder>[]) => void
) {
  const { user, authenticated } = usePrivy();
  const userAddress = user?.wallet?.address as Address;

  const query = useQuery({
    queryKey: [QueryKeys.OrderHistory, userAddress],
    queryFn: async () => {
      if (!userAddress) {
        throw new Error("User address not available");
      }

      // Use getUserFills instead of getUserOrderHistory for better data
      const orderHistory = await hyperliquidApi.getUserOrderHistory(
        userAddress,
      );

      // Update context state
      setOrderHistory(orderHistory);

      return orderHistory;
    },
    enabled: authenticated && !!userAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Data considered fresh for 15 seconds
  });

  return query;
}
