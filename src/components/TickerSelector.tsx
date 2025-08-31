"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronDown, Star, Check } from "lucide-react";
import { useMarketData } from "@/contexts/MarketDataContext";
import { cn } from "@/lib/utils";

export function TickerSelector() {
  const { marketData, selectedSymbol, setSelectedSymbol, availableAssets } =
    useMarketData();
  const [open, setOpen] = useState(false);

  const handleAssetSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setOpen(false);
  };
  return (
    <div className="flex items-center space-x-3">
      <Button variant="ghost" size="sm" className="p-1">
        <Star className="h-4 w-4 text-gray-400" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="w-auto justify-between hover:bg-gray-800 rounded px-3 py-2 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded-full bg-teal-500 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {selectedSymbol ? selectedSymbol.charAt(0) : "?"}
                </span>
              </div>
              <span className="text-lg font-semibold text-white">
                {selectedSymbol ? `${selectedSymbol}-USD` : "Select symbol..."}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 bg-gray-900 border-gray-700">
          <Command className="bg-gray-900">
            <CommandInput placeholder="Search perpetuals..." className="h-9" />
            <CommandList>
              <CommandEmpty>No perpetual found.</CommandEmpty>
              <CommandGroup>
                {availableAssets.map((symbol) => {
                  const data = marketData[symbol];
                  const price = data
                    ? parseFloat(data.price).toFixed(symbol === "BTC" ? 0 : 3)
                    : "0.000";
                  const change = data?.changePercent24h || "0.00%";

                  return (
                    <CommandItem
                      key={symbol}
                      value={symbol}
                      onSelect={() => handleAssetSelect(symbol)}
                      className="flex items-center justify-between p-3 hover:bg-gray-800 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="h-5 w-5 rounded-full bg-teal-500 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {symbol.charAt(0)}
                          </span>
                        </div>
                        <span className="text-white">{symbol}-USD</span>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            selectedSymbol === symbol
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-white">${price}</div>
                        <div
                          className={`text-xs ${
                            change.startsWith("-")
                              ? "text-red-400"
                              : "text-teal-400"
                          }`}
                        >
                          {change}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* <Badge
        variant="outline"
        className="text-teal-400 border-teal-600 bg-teal-900/20"
      >
        Perpetual
      </Badge> */}
    </div>
  );
}
