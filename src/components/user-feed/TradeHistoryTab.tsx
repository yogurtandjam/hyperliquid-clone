"use client";
import { formatters } from "@/lib/utils";
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

export function TradeHistoryTab() {
  const { tradeHistory } = useAppData();
  
  // For now, we'll assume loading is complete if we have the context
  // Later we can add loading/error states to the AppContext if needed
  const isLoading = false;
  const userTrades = tradeHistory;

  // Show last 50 trades
  const allTrades = userTrades.slice(0, 50);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">
        Loading trade history...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Coin</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allTrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                  No trade history
                </TableCell>
              </TableRow>
            ) : (
              allTrades.map((trade, index) => (
                <TableRow
                  key={`${trade.time}-${trade.coin}-${index}`}
                  className="hover:bg-gray-800/50"
                >
                  <TableCell className="text-gray-400">
                    {formatters.formatTime(trade.time)}
                  </TableCell>
                  <TableCell className="font-semibold">{trade.coin}</TableCell>
                  <TableCell
                    className={
                      trade.side === "buy" ? "text-green-400" : "text-red-400"
                    }
                  >
                    {trade.side.toUpperCase()}
                  </TableCell>
                  <TableCell className="text-right">{trade.price}</TableCell>
                  <TableCell className="text-right">{trade.size}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
