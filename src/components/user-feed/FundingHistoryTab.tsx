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

export function FundingHistoryTab() {
  const { fundingHistory } = useAppData();
  
  // For now, we'll assume loading is complete if we have the context
  // Later we can add loading/error states to the AppContext if needed
  const isLoading = false;
  const error = null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">Loading funding history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400">Error loading funding history</div>
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
              <TableHead className="text-left">Size</TableHead>
              <TableHead className="text-left">Position Side</TableHead>
              <TableHead className="text-left">Payment</TableHead>
              <TableHead className="text-left">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fundingHistory.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-gray-400"
                >
                  No funding history available
                </TableCell>
              </TableRow>
            ) : (
              fundingHistory.map((row, i) => {
                const isLong = parseFloat(row.delta.szi) > 0;
                return (
                  <TableRow key={i} className="hover:bg-gray-800/50">
                    <TableCell>{new Date(row.time).toLocaleString()}</TableCell>
                    <TableCell
                      className={`font-extrabold text-left ${
                        isLong ? "text-green-400" : "text-red-300"
                      }`}
                    >
                      {row.delta.coin}
                    </TableCell>
                    <TableCell className="text-left">
                      {Math.abs(parseFloat(row.delta.szi))} {row.delta.coin}
                    </TableCell>
                    <TableCell
                      className={`text-left ${
                        isLong ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {isLong ? "Long" : "Short"}
                    </TableCell>
                    <TableCell
                      className={`text-left ${
                        parseFloat(row.delta.usdc) > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      ${parseFloat(row.delta.usdc).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-left">
                      {(parseFloat(row.delta.fundingRate) * 100).toFixed(4)}%
                    </TableCell>
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
