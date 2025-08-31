"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { useMarketData } from "@/contexts/MarketDataContext";

interface OrderBookEntry {
  price: string;
  size: string;
  total: string;
}

export function OrderBook() {
  const { orderBook, recentTrades, selectedSymbol, isConnected } =
    useMarketData();

  const OrderBookTable = ({
    data,
    type,
  }: {
    data: OrderBookEntry[];
    type: "asks" | "bids";
  }) => (
    <div className="space-y-1">
      {data.map((entry, index) => (
        <div
          key={index}
          className={`grid grid-cols-3 gap-2 text-xs py-1 px-2 rounded hover:bg-gray-800/50 cursor-pointer ${
            type === "asks" ? "order-book-ask" : "order-book-bid"
          }`}
        >
          <div className="text-right font-mono">{entry.price}</div>
          <div className="text-right font-mono text-gray-300">{entry.size}</div>
          <div className="text-right font-mono text-gray-300">
            {entry.total}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="trading-panel h-full">
      <Tabs defaultValue="orderbook" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 mb-4">
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

        <TabsContent value="orderbook" className="flex-1 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-teal-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-gray-400">
                {isConnected ? "Live" : "Disconnected"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">{selectedSymbol}</span>
              <div className="h-4 w-4 bg-gray-700 rounded border"></div>
            </div>
          </div>

          {/* Header */}
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 pb-2 border-b border-gray-700">
            <div className="text-right">Price</div>
            <div className="text-right">Size ({selectedSymbol})</div>
            <div className="text-right">Total ({selectedSymbol})</div>
          </div>

          <ScrollArea className="flex-1 h-64">
            {orderBook ? (
              <>
                {/* Asks */}
                <div className="mb-4">
                  <OrderBookTable
                    data={[...orderBook.asks].reverse()}
                    type="asks"
                  />
                </div>

                {/* Spread */}
                <div className="flex items-center justify-center py-2 border-y border-gray-700 bg-gray-800/30">
                  <div className="text-center">
                    <div className="text-white font-mono text-lg">
                      {orderBook.bids[0]?.price || "0.000"}
                    </div>
                    <div className="text-xs text-gray-400">
                      Spread {orderBook.spread.absolute}{" "}
                      {orderBook.spread.percentage}
                    </div>
                  </div>
                </div>

                {/* Bids */}
                <div className="mt-4">
                  <OrderBookTable data={orderBook.bids} type="bids" />
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Loading order book...
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="trades" className="flex-1">
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 pb-2 border-b border-gray-700">
            <div className="text-right">Price</div>
            <div className="text-right">Size ({selectedSymbol})</div>
            <div className="text-right">Time</div>
          </div>

          <ScrollArea className="h-80 scrollbar-thin">
            {recentTrades.length > 0 ? (
              <div className="space-y-1">
                {recentTrades.map((trade, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-2 text-xs py-1 px-2 rounded hover:bg-gray-800/50 cursor-pointer group"
                  >
                    <div
                      className={`text-right font-mono ${
                        trade.side === "buy" ? "text-teal-400" : "text-red-400"
                      }`}
                    >
                      {parseFloat(trade.price).toFixed(3)}
                    </div>
                    <div className="text-right font-mono text-gray-300">
                      {parseFloat(trade.size).toFixed(2)}
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
