"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { usePrivy } from "@privy-io/react-auth";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { formatters, toNumSafe } from "@/lib/utils";
import { useAppData } from "@/contexts/AppContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Order {
  time: string;
  type: string;
  coin: string;
  direction: "buy" | "sell";
  size: string;
  originalSize: string;
  orderValue: string;
  price: string;
  reduceOnly: boolean;
  triggerConditions: string;
}

export function OpenOrdersTab() {
  const { openOrders } = useAppData();

  // Convert orders from context to display format
  const orders: Order[] = openOrders.map((order) => {
    const size = toNumSafe(order.sz) || 0;
    const price = toNumSafe(order.px) || 0;
    const orderValue = size * price;

    return {
      time: formatters.formatTime(order.timestamp),
      type: order.orderType === "limit" ? "Limit" : "Market",
      coin: order.coin,
      direction: order.side,
      size: order.sz,
      originalSize: order.origSz,
      orderValue: `$${orderValue.toFixed(2)}`,
      price: order.px,
      reduceOnly: order.reduceOnly,
      triggerConditions: "—", // TODO: Add trigger conditions when available
    };
  });

  return (
    <div className="space-y-4">
      <ScrollArea className="h-80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Coin</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-right">Original Size</TableHead>
              <TableHead className="text-right">Order Value</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center">Reduce Only</TableHead>
              <TableHead>Trigger Conditions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-8 text-gray-400"
                >
                  No open orders
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order, index) => (
                <TableRow key={index} className="hover:bg-gray-800/50">
                  <TableCell className="text-gray-400">{order.time}</TableCell>
                  <TableCell className="text-gray-300">{order.type}</TableCell>
                  <TableCell className="font-semibold">{order.coin}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.direction === "buy" ? "default" : "destructive"
                      }
                      className="text-xs"
                    >
                      {order.direction.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{order.size}</TableCell>
                  <TableCell className="text-right">
                    {order.originalSize}
                  </TableCell>
                  <TableCell className="text-right">
                    {order.orderValue}
                  </TableCell>
                  <TableCell className="text-right">{order.price}</TableCell>
                  <TableCell className="text-center">
                    {order.reduceOnly && (
                      <Badge variant="outline" className="text-xs">
                        RO
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {order.triggerConditions}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
