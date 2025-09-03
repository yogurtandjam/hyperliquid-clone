"use client";

import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/custom-tabs";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { BalancesTab } from "./BalancesTab";
import { PositionsTab } from "./PositionsTab";
import { OpenOrdersTab } from "./OpenOrdersTab";
import { TwapTab } from "./TwapTab";
import { TradeHistoryTab } from "./TradeHistoryTab";
import { FundingHistoryTab } from "./FundingHistoryTab";
import { OrderHistoryTab } from "./OrderHistoryTab";

const TABS = [
  { key: "balances", label: "Balances" },
  { key: "positions", label: "Positions" },
  { key: "orders", label: "Open Orders" },
  { key: "twap", label: "TWAP" },
  { key: "history", label: "Trade History" },
  { key: "funding", label: "Funding History" },
  { key: "order-history", label: "Order History" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function UserFeed() {
  const { user } = usePrivy();
  const [selectedTab, setSelectedTab] = useState<TabKey>("balances");

  if (!user?.wallet?.address) {
    return (
      <div className="text-center py-8 text-gray-400">
        Connect a wallet to view balances, positions, and history.
      </div>
    );
  }

  return (
    <div className="trading-panel">
      <Tabs
        value={selectedTab}
        onValueChange={(value) => setSelectedTab(value as TabKey)}
      >
        <div className="flex items-center justify-between mb-4 h-[34px] overflow-x-auto">
          <TabsList className="flex-shrink-0">
            <TabsTrigger
              value="balances"
              className="data-[state=active]:bg-teal-600"
            >
              Balances
            </TabsTrigger>
            <TabsTrigger
              value="positions"
              className="data-[state=active]:bg-teal-600"
            >
              Positions
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-teal-600"
            >
              Open Orders
            </TabsTrigger>
            <TabsTrigger
              value="twap"
              className="data-[state=active]:bg-teal-600"
            >
              TWAP
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-teal-600"
            >
              Trade History
            </TabsTrigger>
            <TabsTrigger
              value="funding"
              className="data-[state=active]:bg-teal-600"
            >
              Funding History
            </TabsTrigger>
            <TabsTrigger
              value="order-history"
              className="data-[state=active]:bg-teal-600"
            >
              Order History
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 border-b-2 border-b-gray-600 h-full" />

          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="balances" className="space-y-4">
          <BalancesTab />
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <PositionsTab />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <OpenOrdersTab />
        </TabsContent>

        <TabsContent value="twap" className="space-y-4">
          <TwapTab />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <TradeHistoryTab />
        </TabsContent>

        <TabsContent value="funding" className="space-y-4">
          <FundingHistoryTab />
        </TabsContent>

        <TabsContent value="order-history" className="space-y-4">
          <OrderHistoryTab />
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Deposits and withdrawals are not allowed.
      </div>
    </div>
  );
}
