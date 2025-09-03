"use client";

import { useAppData } from "@/contexts/AppContext";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { QueryKeys } from "@/types";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export function useFundingHistory(days: number = 7) {
  const { selectedSymbol, fundingHistory, setFundingHistory } = useAppData();
  const { user } = usePrivy();

  const query = useQuery({
    queryKey: [QueryKeys.FundingHistory],
    queryFn: async () => {
      if (!user?.wallet?.address) {
        throw new Error("No user");
      }
      const endTime = Math.floor(Date.now());
      const startTime = endTime - days * 24 * 60 * 60 * 1000;
      const rawFundingHistory = await hyperliquidApi.getFundingHistory(
        user?.wallet?.address,
        startTime,
        endTime,
      );
      console.log(rawFundingHistory);
      // Update context state
      setFundingHistory(rawFundingHistory.sort((a, b) => b.time - a.time));
      return rawFundingHistory;
    },
    enabled: !!user?.wallet?.address,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Data considered fresh for 30 seconds
  });

  // Return data from context state, with query status
  return {
    ...query,
    data: fundingHistory,
  };
}
