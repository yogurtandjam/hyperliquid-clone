"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppData } from "@/contexts/AppContext";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { FundingHistoryItem } from "@/types";

export function useFundingHistory(days: number = 7) {
  const { selectedSymbol, fundingHistory, setFundingHistory } = useAppData();

  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - days * 24 * 60 * 60;

  const query = useQuery({
    queryKey: ["fundingHistory", selectedSymbol, startTime, endTime],
    queryFn: async () => {
      if (!selectedSymbol) {
        throw new Error("No symbol selected");
      }

      const rawFundingHistory = await hyperliquidApi.getFundingHistory(
        selectedSymbol,
        startTime,
        endTime,
      );

      // Transform API response to FundingHistoryItem format
      const formattedHistory: FundingHistoryItem[] = Array.isArray(
        rawFundingHistory,
      )
        ? rawFundingHistory.map((funding: any) => ({
            coin: selectedSymbol,
            fundingRate: funding.fundingRate || "0",
            premium: funding.premium || "0",
            time: funding.time,
          }))
        : [];

      // Update context state
      setFundingHistory(formattedHistory);
      return formattedHistory;
    },
    enabled: !!selectedSymbol,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Data considered fresh for 30 seconds
  });

  // Return data from context state, with query status
  return {
    ...query,
    data:
      fundingHistory.length > 0 && fundingHistory[0]?.coin === selectedSymbol
        ? fundingHistory
        : query.data,
  };
}
