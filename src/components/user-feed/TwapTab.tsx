"use client";

import { useTwapData } from "@/hooks/useTwapData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TwapTab() {
  const { data: twapData, isLoading, error } = useTwapData(24); // Last 24 hours

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">Loading TWAP data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400">Error loading TWAP data</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-80">
        {twapData ? (
          <div className="space-y-6">
            {/* TWAP Summary Card */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-gray-200">
                TWAP Summary ({twapData.period})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Time-Weighted Average Price</p>
                  <p className="text-2xl font-mono text-green-400">
                    ${twapData.twap}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Total Volume</p>
                  <p className="text-xl font-mono text-blue-400">
                    {twapData.volume}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Number of Trades</p>
                  <p className="text-xl font-mono text-purple-400">
                    {twapData.trades}
                  </p>
                </div>
              </div>
            </div>

            {/* TWAP Details Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-gray-800/50">
                  <TableCell className="font-semibold">Average Price</TableCell>
                  <TableCell className="text-right font-mono">
                    ${twapData.twap}
                  </TableCell>
                  <TableCell className="text-right text-gray-400">
                    {twapData.period}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-gray-800/50">
                  <TableCell className="font-semibold">Volume</TableCell>
                  <TableCell className="text-right font-mono">
                    {twapData.volume}
                  </TableCell>
                  <TableCell className="text-right text-gray-400">
                    {twapData.period}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-gray-800/50">
                  <TableCell className="font-semibold">Trade Count</TableCell>
                  <TableCell className="text-right font-mono">
                    {twapData.trades}
                  </TableCell>
                  <TableCell className="text-right text-gray-400">
                    {twapData.period}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-gray-800/50">
                  <TableCell className="font-semibold">
                    Average Trade Size
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {twapData.trades > 0
                      ? (parseFloat(twapData.volume) / twapData.trades).toFixed(4)
                      : "0"}
                  </TableCell>
                  <TableCell className="text-right text-gray-400">
                    Per Trade
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No TWAP data available
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
