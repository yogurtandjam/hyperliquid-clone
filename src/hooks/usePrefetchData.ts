"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { QueryKeys } from "@/types";
import { useCallback } from "react";

export function usePrefetchData(selectedSymbol?: string) {
  const queryClient = useQueryClient();
  const { user, authenticated } = usePrivy();
  const userAddress = user?.wallet?.address;

  const prefetchAll = useCallback(async () => {
    if (!authenticated || !userAddress) {
      console.log("⏸️ Skipping prefetch - user not authenticated");
      return;
    }

    console.log("🚀 Prefetching all data hooks...");
    
    const prefetchPromises = [
      // Trade history
      queryClient.prefetchQuery({
        queryKey: [QueryKeys.Trades, userAddress],
        staleTime: 30000,
      }),
      
      // Order history
      queryClient.prefetchQuery({
        queryKey: [QueryKeys.OrderHistory, userAddress],
        staleTime: 15000,
      }),
      
      // TWAP data
      queryClient.prefetchQuery({
        queryKey: [QueryKeys.TwapData, userAddress],
        staleTime: 30000,
      }),
    ];

    // Add funding history if we have a selected symbol
    if (selectedSymbol) {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (7 * 24 * 60 * 60); // 7 days
      
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: [QueryKeys.FundingHistory, selectedSymbol, startTime, endTime],
          staleTime: 30000,
        })
      );
    }

    try {
      await Promise.allSettled(prefetchPromises);
      console.log("✅ Data prefetch completed successfully");
    } catch (error) {
      console.error("❌ Error during data prefetch:", error);
    }
  }, [queryClient, authenticated, userAddress, selectedSymbol]);

  const prefetchTrades = useCallback(async () => {
    if (!userAddress) return;
    return queryClient.prefetchQuery({
      queryKey: [QueryKeys.Trades, userAddress],
    });
  }, [queryClient, userAddress]);

  const prefetchOrderHistory = useCallback(async () => {
    if (!userAddress) return;
    return queryClient.prefetchQuery({
      queryKey: [QueryKeys.OrderHistory, userAddress],
    });
  }, [queryClient, userAddress]);

  const prefetchFundingHistory = useCallback(async () => {
    if (!selectedSymbol) return;
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (7 * 24 * 60 * 60);
    
    return queryClient.prefetchQuery({
      queryKey: [QueryKeys.FundingHistory, selectedSymbol, startTime, endTime],
    });
  }, [queryClient, selectedSymbol]);

  const prefetchTwapData = useCallback(async () => {
    if (!userAddress) return;
    return queryClient.prefetchQuery({
      queryKey: [QueryKeys.TwapData, userAddress],
    });
  }, [queryClient, userAddress]);

  return {
    prefetchAll,
    prefetchTrades,
    prefetchOrderHistory,
    prefetchFundingHistory,
    prefetchTwapData,
  };
}