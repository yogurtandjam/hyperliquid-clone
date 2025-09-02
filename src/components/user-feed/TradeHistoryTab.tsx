"use client";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { formatters } from "@/lib/utils";

interface Trade {
  time: number;
  coin: string;
  side: string;
  price: string;
  size: string;
  txHash?: string;
}

export function TradeHistoryTab() {
  const { user } = usePrivy();
  const [userTrades, setUserTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.wallet?.address) return;

    const fetchUserTrades = async () => {
      setLoading(true);
      try {
        const response = await hyperliquidApi.getUserFills(user.wallet.address);
        if (response && Array.isArray(response)) {
          const mapped: Trade[] = response
            .map((fill) => ({
              time: Number(fill.time || fill.time || Date.now()),
              coin: String(fill.coin || ""),
              side: String(fill.dir) || "",
              price: formatters.formatPrice(fill.px || "0"),
              size: formatters.formatSize(fill.sz || "0"),
              txHash: fill.hash,
            }))
            .sort((a, b) => b.time - a.time)
            .slice(0, 100); // Limit to last 100 trades
          setUserTrades(mapped);
        }
      } catch (error) {
        console.error("Error fetching user trades:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTrades();
  }, [user?.wallet?.address]);

  // Combine user trades with recent market trades if available
  const allTrades = [...userTrades]
    .sort((a, b) => b.time - a.time)
    .slice(0, 50); // Show last 50 trades

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        Loading trade history...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allTrades.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No trade history</div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-2 text-xs text-gray-400 pb-2 border-b border-gray-700">
            <div>Time</div>
            <div>Coin</div>
            <div>Direction</div>
            <div className="text-right">Price</div>
            <div className="text-right">Size</div>
          </div>
          {allTrades.map((trade, index) => (
            <div
              key={`${trade.time}-${trade.coin}-${index}`}
              className="grid grid-cols-5 gap-2 text-sm py-2 hover:bg-gray-800/50 rounded"
            >
              <div className="text-gray-400">
                {formatters.formatTime(trade.time)}
              </div>
              <div className="font-semibold text-white">{trade.coin}</div>
              <div
                className={
                  trade.side === "buy" ? "text-green-400" : "text-red-400"
                }
              >
                {trade.side.toUpperCase()}
              </div>
              <div className="text-right text-white">{trade.price}</div>
              <div className="text-right text-white">{trade.size}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
