"use client";

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
import { inferDirection } from "@/lib/utils";

export function OrderHistoryTab() {
  const { orderHistory } = useAppData();
  
  // For now, we'll assume loading is complete if we have the context
  // Later we can add loading/error states to the AppContext if needed
  const isLoading = false;
  const error = null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">Loading order history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400">Error loading order history</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-80">
        <Table>
          <TableHeader>
            <TableRow className="text-right">
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Coin</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Filled Size</TableHead>
              <TableHead>Order Value</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Reduce Only</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderHistory.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-gray-400"
                >
                  No order history available
                </TableCell>
              </TableRow>
            ) : (
              orderHistory.map((row, i) => {
                const { order, status } = row;
                const {
                  timestamp,
                  coin,
                  side,
                  orderType,
                  triggerCondition,
                  triggerPx,
                  reduceOnly,
                  limitPx,
                  sz,
                  origSz,
                } = order;
                return (
                  <TableRow key={i} className="hover:bg-gray-800/50">
                    <TableCell>
                      {new Date(timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{orderType}</TableCell>
                    <TableCell>{coin}</TableCell>
                    <TableCell>
                      {inferDirection(side, orderType, { reduceOnly })}
                    </TableCell>
                    <TableCell>{origSz}</TableCell>
                    <TableCell>{sz}</TableCell>
                    <TableCell>
                      {(parseFloat(origSz) * parseFloat(limitPx)).toFixed(2)}{" "}
                      USDC
                    </TableCell>
                    <TableCell>{limitPx ?? "Market"}</TableCell>
                    <TableCell>{reduceOnly ?? "No"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
