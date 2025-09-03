"use client";

import { useQuery } from "@tanstack/react-query";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { usePrivy } from "@privy-io/react-auth";
import { Address } from "viem";
import { QueryKeys, TwapData } from "@/types";

export function useInitialTwapData(
  setTwapData: (twapData: TwapData) => void,
  hours: number = 24
) {
  const { user, authenticated } = usePrivy();
  const userAddress = user?.wallet?.address as Address;

  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - hours * 60 * 60;

  const query = useQuery({
    queryKey: [QueryKeys.TwapData, userAddress, hours],
    queryFn: async () => {
      if (!userAddress) {
        throw new Error("User address not available");
      }

      const twapSliceData = await hyperliquidApi.getTwapData(userAddress);

      // Process TWAP slice data
      if (!twapSliceData || !Array.isArray(twapSliceData)) {
        return { twap: "0", volume: "0", trades: 0, period: `${hours}h` };
      }

      // Calculate aggregated TWAP metrics from slice fills
      let totalVolume = 0;
      let totalTrades = twapSliceData.length;
      let weightedPrice = 0;

      for (const slice of twapSliceData) {
        const volume = parseFloat(slice.sz || "0");
        const price = parseFloat(slice.px || "0");

        totalVolume += volume;
        weightedPrice += price * volume;
      }

      const twap =
        totalVolume > 0 ? (weightedPrice / totalVolume).toFixed(4) : "0";

      const result = {
        twap,
        volume: totalVolume.toFixed(2),
        trades: totalTrades,
        period: `${hours}h`,
      };

      // Update context state
      setTwapData(result);
      return result;
    },
    enabled: authenticated && !!userAddress,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Data considered fresh for 30 seconds
  });

  return query;
}
