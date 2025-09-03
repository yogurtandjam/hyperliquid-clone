"use client";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { num } from "./user-feed/shared";

export function AccountEquity() {
  const { user } = usePrivy();
  const [equityUsd, setEquityUsd] = useState<number | undefined>();

  useEffect(() => {
    if (!user?.wallet?.address) return;

    const fetchAccountEquity = async () => {
      try {
        const state = await hyperliquidApi.getUserState(user.wallet.address);
        if (state) {
          const eq =
            num(state?.equityUsd) ??
            num(state?.account?.equityUsd) ??
            num(state?.marginSummary?.equityUsd);
          setEquityUsd(eq);
        }
      } catch (error) {
        console.error("Error fetching account equity:", error);
      }
    };

    fetchAccountEquity();
  }, [user?.wallet?.address]);

  if (!user?.wallet?.address) {
    return (
      <div className="text-center py-8 text-gray-400">
        Connect a wallet to view account equity.
      </div>
    );
  }

  const accountEquity = {
    spot: "$0.00",
    perps: "$0.00",
    balance: "$0.00",
    unrealizedPnl: "$0.00",
    crossMarginRatio: "0.00%",
    maintenanceMargin: "$0.00",
    crossAccountLeverage: "0.00x",
  };

  return (
    <div className="trading-panel">
      <div className="text-sm font-semibold text-white mb-3">
        Account Equity
      </div>
      <div className="grid grid-cols-2 gap-1 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Spot</span>
            <span className="text-white">{accountEquity.spot}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Perps</span>
            <span className="text-white">{accountEquity.perps}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Balance</span>
            <span className="text-white">{accountEquity.balance}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Unrealized PNL</span>
            <span className="text-white">{accountEquity.unrealizedPnl}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Cross Margin Ratio</span>
            <span className="text-white">
              {accountEquity.crossMarginRatio}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Maintenance Margin</span>
            <span className="text-white">
              {accountEquity.maintenanceMargin}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Cross Account Leverage</span>
            <span className="text-white">
              {accountEquity.crossAccountLeverage}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}