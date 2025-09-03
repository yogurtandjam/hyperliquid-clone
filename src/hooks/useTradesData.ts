import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useAppData } from "@/contexts/AppContext";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { formatters } from "@/lib/utils";
import { QueryKeys, Trade } from "@/types";

export const useTradesData = () => {
  const { user } = usePrivy();
  const { tradeHistory, setTradeHistory } = useAppData();

  const query = useQuery({
    queryKey: [QueryKeys.Trades, user?.wallet?.address],
    queryFn: async (): Promise<Trade[]> => {
      if (!user?.wallet?.address) {
        return [];
      }

      const response = await hyperliquidApi.getUserFills(user.wallet.address);
      if (response && Array.isArray(response)) {
        const mapped: Trade[] = response
          .map((fill) => ({
            coin: String(fill.coin || ""),
            side:
              String(fill.dir) === "Open Long" ||
              String(fill.dir) === "Close Short"
                ? "buy"
                : "sell",
            price: formatters.formatPrice(fill.px || "0"),
            size: formatters.formatSize(fill.sz || "0"),
            time: Number(fill.time || Date.now()),
            txHash: fill.hash,
          }))
          .sort((a, b) => b.time - a.time)
          .slice(0, 100); // Limit to last 100 trades

        // Update context state
        setTradeHistory(mapped);
        return mapped;
      }
      return [];
    },
    enabled: !!user?.wallet?.address,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Return data from context state, with query status
  return {
    ...query,
    data: tradeHistory.length > 0 ? tradeHistory : query.data,
  };
};
