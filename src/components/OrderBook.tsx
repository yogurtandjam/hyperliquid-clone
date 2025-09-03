"use client";

import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/custom-tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { useMarketData } from "@/contexts/AppContext";

interface OrderBookEntry {
  price: string;
  size: string;
  total: string;
}

export function OrderBook() {
  const { orderBook, recentTrades, selectedSymbol, selectedAsset } =
    useMarketData();

  const OrderBookTable = ({
    data,
    type,
    maxTotal,
  }: {
    data: OrderBookEntry[];
    type: "asks" | "bids";
    maxTotal: number;
  }) => (
    <div className="space-y-0.5">
      {data.map((entry, index) => {
        const fillPercentage =
          maxTotal > 0 ? (parseFloat(entry.total) / maxTotal) * 100 : 0;

        return (
          <div
            key={index}
            className={`grid grid-cols-3 gap-2 text-xs rounded hover:bg-gray-800/50 cursor-pointer relative ${
              type === "asks" ? "order-book-ask" : "order-book-bid"
            }`}
            style={{
              background: `linear-gradient(to right, ${
                type === "asks"
                  ? `rgba(127, 29, 29, 0.2) ${fillPercentage}%`
                  : `rgba(20, 83, 45, 0.2) ${fillPercentage}%`
              }, transparent ${fillPercentage}%)`,
            }}
          >
            <div className="text-left font-mono py-1 px-2">{entry.price}</div>
            <div className="text-right font-mono text-gray-300 py-1 px-2">
              {selectedAsset
                ? parseFloat(entry.size).toFixed(selectedAsset.szDecimals)
                : entry.size}
            </div>
            <div className="text-right font-mono text-gray-300 py-1 px-2">
              {selectedAsset
                ? parseFloat(entry.total).toFixed(selectedAsset.szDecimals)
                : entry.total}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="trading-panel h-full p-0">
      <Tabs defaultValue="orderbook" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger
            value="orderbook"
            className="data-[state=active]:bg-teal-600"
          >
            Order Book
          </TabsTrigger>
          <TabsTrigger
            value="trades"
            className="data-[state=active]:bg-teal-600"
          >
            Trades
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="orderbook"
          className="flex-1 space-y-4  flex flex-col"
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 pb-2 border-b border-gray-700 px-2">
              <div className="text-left">Price</div>
              <div className="text-right">Size ({selectedSymbol})</div>
              <div className="text-right">Total ({selectedSymbol})</div>
            </div>
            {orderBook ? (
              (() => {
                const asksData = [...orderBook.asks].reverse().slice(0, 10);
                const bidsData = orderBook.bids.slice(0, 10);

                // Calculate max totals for each side
                const maxAsksTotal = Math.max(
                  ...asksData.map((ask) => parseFloat(ask.total)),
                );
                const maxBidsTotal = Math.max(
                  ...bidsData.map((bid) => parseFloat(bid.total)),
                );

                return (
                  <>
                    {/* Asks */}
                    <div>
                      <OrderBookTable
                        data={asksData}
                        type="asks"
                        maxTotal={maxAsksTotal}
                      />
                    </div>

                    {/* Spread */}
                    <div className="flex items-center justify-evenly py-1 bg-gray-700 text-xs">
                      <span>Spread</span>
                      <span>{orderBook.spread.absolute}</span>
                      <span>{orderBook.spread.percentage}</span>
                    </div>

                    {/* Bids */}
                    <div>
                      <OrderBookTable
                        data={bidsData}
                        type="bids"
                        maxTotal={maxBidsTotal}
                      />
                    </div>
                  </>
                );
              })()
            ) : (
              <div className="text-center py-8 text-gray-400">
                Loading order book...
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="trades" className="flex-1 space-y-4 flex flex-col">
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 pb-2 border-b border-gray-700">
            <div className="text-right">Price</div>
            <div className="text-right">Size ({selectedSymbol})</div>
            <div className="text-right">Time</div>
          </div>

          <ScrollArea className="flex-1 min-h-0 scrollbar-thin">
            {recentTrades.length > 0 ? (
              <div className="space-y-1">
                {recentTrades.map((trade, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-2 text-xs py-1 px-2 rounded hover:bg-gray-800/50 cursor-pointer group"
                  >
                    <div
                      className={`text-left font-mono ${
                        trade.side === "buy" ? "text-teal-400" : "text-red-400"
                      }`}
                    >
                      {trade.price}
                    </div>
                    <div className="text-right font-mono text-gray-300">
                      {selectedAsset
                        ? parseFloat(trade.size).toFixed(
                            selectedAsset.szDecimals,
                          )
                        : parseFloat(trade.size)}
                    </div>
                    <div className="text-right font-mono text-gray-300 flex items-center justify-end space-x-1">
                      <span>
                        {new Date(trade.timestamp).toLocaleTimeString("en-US", {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      {trade.txHash && (
                        <a
                          href={`https://app.hyperliquid.xyz/explorer/tx/${trade.txHash}`}
                          target="_blank"
                        >
                          <ExternalLink className="h-3 w-3 text-gray-500" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Loading trades...
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
