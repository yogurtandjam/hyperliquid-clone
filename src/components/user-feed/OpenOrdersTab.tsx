"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { usePrivy } from "@privy-io/react-auth";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { formatters } from "@/lib/utils";

interface Order {
  coin: string;
  side: "buy" | "sell";
  type: string;
  size: string;
  price: string;
  filled: string;
  status: "open" | "filled" | "cancelled";
  time: string;
}

export function OpenOrdersTab() {
  const { user } = usePrivy();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user?.wallet?.address) return;

    const fetchOrders = async () => {
      try {
        const response = await hyperliquidApi.getUserOpenOrders(
          user.wallet.address,
        );
        if (response) {
          const mapped: Order[] = response.map((o: any) => ({
            coin: String(o.coin ?? o.asset ?? ""),
            side: String(o.side ?? (o.b ? "buy" : "sell")) as "buy" | "sell",
            type: "Limit", // Most orders are limit orders
            size: formatters.formatSize(o.sz ?? o.size ?? "0"),
            price: formatters.formatPrice(o.px ?? o.price ?? "0"),
            filled: formatters.formatSize("0"), // TODO: get filled amount
            status: "open" as const,
            time: formatters.formatTime(o.timestamp ?? Date.now()),
          }));
          setOrders(mapped);
        }
      } catch (error) {
        console.error("Error fetching open orders:", error);
      }
    };

    fetchOrders();
  }, [user?.wallet?.address]);

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No open orders</div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2 text-xs text-gray-400 pb-2 border-b border-gray-700">
            <div>Coin</div>
            <div>Side</div>
            <div>Type</div>
            <div className="text-right">Size</div>
            <div className="text-right">Price</div>
            <div className="text-right">Filled</div>
            <div className="text-right">Time</div>
          </div>
          {orders.map((order, index) => (
            <div
              key={index}
              className="grid grid-cols-7 gap-2 text-sm py-2 hover:bg-gray-800/50 rounded"
            >
              <div className="font-semibold text-white">{order.coin}</div>
              <div>
                <Badge
                  variant={order.side === "buy" ? "default" : "destructive"}
                  className="text-xs"
                >
                  {order.side.toUpperCase()}
                </Badge>
              </div>
              <div className="text-gray-300">{order.type}</div>
              <div className="text-right text-white">{order.size}</div>
              <div className="text-right text-white">{order.price}</div>
              <div className="text-right text-gray-300">{order.filled}</div>
              <div className="text-right text-gray-400">{order.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
