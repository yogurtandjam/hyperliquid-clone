"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, Eye, EyeOff } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { formatters } from "@/lib/utils";
import { num } from "./shared";

type Bal = {
  asset: string;
  balanceUsd?: number;
  balance?: number;
  totalBalance?: string;
  availableBalance?: string;
  usdcValue?: string;
  pnl?: string;
  contract?: string;
};

export function BalancesTab() {
  const { user } = usePrivy();
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [balances, setBalances] = useState<Bal[]>([]);
  const [equityUsd, setEquityUsd] = useState<number | undefined>();

  useEffect(() => {
    if (!user?.wallet?.address) return;

    const fetchBalances = async () => {
      const address = user.wallet?.address;
      if (!user.wallet?.address) {
        console.error("No user wallet connected, not fetching balances");
      }
      try {
        const state = await hyperliquidApi.getUserState(user.wallet.address);
        if (state) {
          // Extract equity
          const eq =
            num(state?.equityUsd) ??
            num(state?.account?.equityUsd) ??
            num(state?.marginSummary?.equityUsd);
          setEquityUsd(eq);

          // Extract balances
          const bals =
            state?.balances ??
            state?.account?.balances ??
            state?.subaccounts?.[0]?.balances ??
            [];
          const mapped: Bal[] = bals.map((b: any) => ({
            asset: String(b.asset ?? b.coin ?? b.symbol ?? "USD"),
            balanceUsd: num(b.balanceUsd ?? b.usd),
            balance: num(b.balance),
            totalBalance: b.balance ? formatters.formatSize(b.balance) : "0.00",
            availableBalance: b.balance
              ? formatters.formatSize(b.balance)
              : "0.00",
            usdcValue: b.balanceUsd
              ? formatters.formatPrice(b.balanceUsd, 2)
              : "0.00",
            pnl: "+0.00", // TODO: calculate PnL
            contract: b.contract || "N/A",
          }));
          setBalances(mapped);
        }
      } catch (error) {
        console.error("Error fetching balances:", error);
      }
    };

    fetchBalances();
  }, [user?.wallet?.address]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHideSmallBalances(!hideSmallBalances)}
          className="text-gray-400 hover:text-white"
        >
          {hideSmallBalances ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="ml-2">Hide Small Balances</span>
        </Button>
      </div>

      {/* Balances Header */}
      <div className="grid grid-cols-6 gap-1 text-xs text-gray-400 pb-2 border-b border-gray-700">
        <div className="flex items-center space-x-1">
          <span>Coin</span>
          <Filter className="h-3 w-3" />
        </div>
        <div className="text-right flex items-center justify-end space-x-1">
          <span>Total Balance</span>
          <Filter className="h-3 w-3" />
        </div>
        <div className="text-right flex items-center justify-end space-x-1">
          <span>Available Balance</span>
          <Filter className="h-3 w-3" />
        </div>
        <div className="text-right flex items-center justify-end space-x-1">
          <span>USDC Value</span>
          <Filter className="h-3 w-3" />
        </div>
        <div className="text-right flex items-center justify-end space-x-1">
          <span>PNL (ROE %)</span>
          <Filter className="h-3 w-3" />
        </div>
        <div className="text-right flex items-center justify-end space-x-1">
          <span>Contract</span>
          <Filter className="h-3 w-3" />
        </div>
      </div>

      {/* Balances Data */}
      <ScrollArea className="h-40">
        {balances.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No balances yet</div>
        ) : (
          <div className="space-y-2">
            {balances.map((balance, index) => (
              <div
                key={index}
                className="grid grid-cols-6 gap-1 text-sm py-2 hover:bg-gray-800/50 rounded"
              >
                <div className="font-semibold text-white">{balance.asset}</div>
                <div className="text-right text-white">
                  {balance.totalBalance}
                </div>
                <div className="text-right text-white">
                  {balance.availableBalance}
                </div>
                <div className="text-right text-white">{balance.usdcValue}</div>
                <div className="text-right text-teal-400">{balance.pnl}</div>
                <div className="text-right text-gray-400 font-mono text-xs">
                  {balance.contract}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
