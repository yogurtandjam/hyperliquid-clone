"use client";

import { hyperliquidApi } from "@/services/hyperliquidApi";
import { QueryKeys } from "@/types";
import { UserFundingUpdate } from "@nktkas/hyperliquid";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export function useInitialFundingHistory(
  days: number = 7,
  setFundingHistory: (fundingHistory: UserFundingUpdate[]) => void,
) {
  const { user } = usePrivy();

  const query = useQuery({
    queryKey: [QueryKeys.FundingHistory, user?.wallet?.address],
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
      // Update context state
      const sortedHistory = rawFundingHistory.sort((a, b) => b.time - a.time);
      setFundingHistory(sortedHistory);

      return rawFundingHistory;
    },
    enabled: !!user?.wallet?.address,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Data considered fresh for 30 seconds
  });

  return query;
}
