"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, Eye, EyeOff, Send, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePrivy } from "@privy-io/react-auth";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { formatters, toNumSafe } from "@/lib/utils";
import { useAppData } from "@/contexts/AppContext";
import { num } from "./shared";

export type Bal = {
  coin: string;
  totalBalance: string;
  availableBalance: string;
  usdcValue: string;
  pnlRoe: string;
  send?: boolean;
  transfer?: boolean;
  contract?: string;
};

export function BalancesTab() {
  const { balanceData } = useAppData();

  // Create balance row from webData2 clearingHouseState
  const balances: Bal[] = balanceData
    ? [
        {
          coin: "USDC (Perps)",
          totalBalance: balanceData.accountValue || "0.00",
          availableBalance: balanceData.availableBalance || "0.00",
          usdcValue: balanceData.accountValue || "0.00",
          pnlRoe: balanceData.unrealizedPnl
            ? `$${balanceData.unrealizedPnl.toFixed(2)} (${(
                (balanceData.unrealizedPnl /
                  parseFloat(balanceData.accountValue)) *
                100
              ).toFixed(2)}%)`
            : "+0.00 (+0.00%)",
          send: true,
          transfer: true,
          contract: "N/A", // Perps don't have contracts
        },
      ]
    : [];

  // Filter small balances if enabled
  // const filteredBalances = hideSmallBalances
  //   ? balances.filter((balance) => {
  //       const value = toNumSafe(balance.totalBalance) || 0;
  //       return value > 0.01; // Hide balances smaller than $0.01
  //     })
  //   : balances;

  return (
    <div className="space-y-4">
      <ScrollArea className="h-80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coin</TableHead>
              <TableHead className="text-right">Total Balance</TableHead>
              <TableHead className="text-right">Available Balance</TableHead>
              <TableHead className="text-right">USDC Value</TableHead>
              <TableHead className="text-right">PNL (ROE %)</TableHead>
              <TableHead className="text-center">Send</TableHead>
              <TableHead className="text-center">Transfer</TableHead>
              <TableHead className="text-right">Contract</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-gray-400"
                >
                  {balanceData
                    ? "No balances to display"
                    : "Connect wallet to view balances"}
                </TableCell>
              </TableRow>
            ) : (
              balances.map((balance, index) => (
                <TableRow key={index} className="hover:bg-gray-800/50">
                  <TableCell className="font-semibold">
                    {balance.coin}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(balance.totalBalance).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(balance.availableBalance).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(balance.usdcValue).toFixed(2)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      balanceData?.unrealizedPnl &&
                      balanceData.unrealizedPnl > 0
                        ? "text-teal-400"
                        : "text-red-400"
                    }`}
                  >
                    {balance.pnlRoe}
                  </TableCell>
                  <TableCell className="text-center">
                    {balance.send && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {balance.transfer && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-gray-400 font-mono text-xs">
                    {balance.contract}
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
