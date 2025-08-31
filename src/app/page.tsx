"use client";

import { Header } from "@/components/Header";
import { MarketInfoHeader } from "@/components/MarketInfoHeader";
import { TradingChart } from "@/components/TradingChart";
import { OrderBook } from "@/components/OrderBook";
import { TradingInterface } from "@/components/TradingInterface";
import { AccountInfo } from "@/components/AccountInfo";
import { MarketDataProvider } from "@/contexts/MarketDataContext";
import { WalletProvider } from "@/providers/WalletProvider";

export default function TradingPage() {
  return (
    <WalletProvider>
      <MarketDataProvider>
        <div className="min-h-screen bg-gray-950 trading-gradient">
          <Header />

          <div className="p-4 space-y-4">
            {/* Market Info Header with Ticker Selection */}
            <MarketInfoHeader />

            {/* Main Trading Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
              {/* Chart Section - Takes up most space */}
              <div className="lg:col-span-2">
                <TradingChart />
              </div>

              {/* Order Book */}
              <div className="lg:col-span-1">
                <OrderBook />
              </div>

              {/* Trading Interface */}
              <div className="lg:col-span-1">
                <TradingInterface />
              </div>
            </div>

            {/* Account Information */}
            <div className="h-80">
              <AccountInfo />
            </div>
          </div>
        </div>
      </MarketDataProvider>
    </WalletProvider>
  );
}
