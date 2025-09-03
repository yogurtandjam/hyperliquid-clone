"use client";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { formatters, toNumSafe } from "@/lib/utils";
import { useAppData } from "@/contexts/AppContext";
import { getUserState, num } from "./shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

type Pos = {
  coin: string;
  size: string;
  positionValue: string;
  entryPrice: string;
  markPrice: string;
  pnlRoe: string;
  liquidationPrice: string;
  margin: string;
  funding: string;
};

export function PositionsTab() {
  const { positions, marketData } = useAppData();

  // Convert positions from context to display format - use preformatted strings
  const rows: Pos[] = positions.map((pos) => {
    const markPrice = marketData[pos.coin]?.price || "0";

    return {
      coin: pos.coin,
      size: pos.szi,
      positionValue: pos.positionValue || "—",
      entryPrice: pos.entryPx || "—",
      markPrice,
      pnlRoe:
        pos.unrealizedPnl && pos.returnOnEquity
          ? `${pos.unrealizedPnl} (${pos.returnOnEquity})`
          : "—",
      liquidationPrice: pos.liquidationPrice || "—",
      margin: pos.marginUsed || "—",
      funding: "—", // TODO: Add funding data when available
    };
  });

  return (
    <div className="space-y-4">
      <ScrollArea className="h-80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coin</TableHead>
              <TableHead className="text-left">Size</TableHead>
              <TableHead className="text-left">Position Value</TableHead>
              <TableHead className="text-left">Entry Price</TableHead>
              <TableHead className="text-left">Mark Price</TableHead>
              <TableHead className="text-left">PnL (ROE %)</TableHead>
              <TableHead className="text-left">Liquidation Price</TableHead>
              <TableHead className="text-left">Margin</TableHead>
              <TableHead className="text-left">Funding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-gray-400"
                >
                  No positions yet
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={i} className="hover:bg-gray-800/50">
                  <TableCell className="font-semibold">{r.coin}</TableCell>
                  <TableCell className="text-left">{r.size}</TableCell>
                  <TableCell className="text-left">
                    ${r.positionValue}
                  </TableCell>
                  <TableCell className="text-left">{r.entryPrice}</TableCell>
                  <TableCell className="text-left">{r.markPrice}</TableCell>
                  <TableCell
                    className={`text-left ${
                      r.pnlRoe.startsWith("-")
                        ? "text-red-400"
                        : "text-teal-400"
                    }`}
                  >
                    {r.pnlRoe}
                  </TableCell>
                  <TableCell className="text-left">
                    {r.liquidationPrice}
                  </TableCell>
                  <TableCell className="text-left">${r.margin}</TableCell>
                  <TableCell className="text-left text-gray-400">
                    {r.funding}
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
