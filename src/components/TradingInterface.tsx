"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/contexts/AppContext";
import { useUserAgent } from "@/hooks/useUserAgent";
import { useTrading } from "@/hooks/useTrading";
import { UserAgentSetup } from "./UserAgentSetup";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/custom-tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Info, Settings } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface OrderFormData {
  orderType: "market" | "limit" | "pro";
  side: "buy" | "sell";
  size: string;
  price: string;
  slippage: number;
  availableBalance: string;
}

export function TradingInterface() {
  const { selectedSymbol, selectedAsset, balanceData } = useAppData();
  const { isUserAgentCreated } = useUserAgent();
  const {
    placeMarketOrder,
    placeLimitOrder,
    isPlacingMarketOrder,
    isPlacingLimitOrder,
    isTrading,
  } = useTrading();

  const [orderData, setOrderData] = useState<OrderFormData>({
    orderType: "market",
    side: "buy",
    size: "",
    price: "44.477",
    slippage: 8.0,
    availableBalance: balanceData?.availableBalance || "0.00",
  });

  const [percentageAmount, setPercentageAmount] = useState<number[]>([0]);

  const handleSideChange = (side: "buy" | "sell") => {
    setOrderData((prev) => ({ ...prev, side }));
  };

  const handleOrderTypeChange = (orderType: "market" | "limit" | "pro") => {
    setOrderData((prev) => ({ ...prev, orderType }));
  };

  const handlePercentageClick = (percentage: number) => {
    setPercentageAmount([percentage]);
    // Calculate size based on percentage of available balance
    const availableBalance = parseFloat(balanceData?.availableBalance || "0");
    const currentPrice = parseFloat(orderData.price) || 0;

    let calculatedSize = "0";
    if (currentPrice > 0) {
      // For buy orders, calculate size based on USDC balance / price
      // For sell orders, this would need to be based on position size
      if (orderData.side === "buy") {
        const usdcAmount = (availableBalance * percentage) / 100;
        calculatedSize = (usdcAmount / currentPrice).toFixed(4);
      } else {
        // For sell orders, you'd need position data
        calculatedSize = (
          (availableBalance * percentage) /
          100 /
          currentPrice
        ).toFixed(4);
      }
    }
    setOrderData((prev) => ({ ...prev, size: calculatedSize }));
  };

  const calculateOrderValue = () => {
    const size = parseFloat(orderData.size) || 0;
    const price = parseFloat(orderData.price) || 0;
    return (size * price).toFixed(2);
  };

  const estimatedSlippage = () => {
    return orderData.orderType === "market" ? "0%" : "N/A";
  };

  const handleSubmitOrder = async () => {
    if (
      !selectedSymbol ||
      !selectedAsset ||
      !orderData.size ||
      !isUserAgentCreated
    ) {
      return;
    }

    const sz = orderData.size; // Keep as string for API
    const is_buy = orderData.side === "buy";
    const asset = selectedAsset.index || 0; // Use asset index from selectedAsset

    try {
      if (orderData.orderType === "market") {
        placeMarketOrder({
          asset,
          is_buy,
          sz,
        });
      } else if (orderData.orderType === "limit") {
        const limit_px = orderData.price; // Keep as string for API
        placeLimitOrder({
          asset,
          is_buy,
          sz,
          limit_px,
        });
      }
    } catch (error) {
      console.error("Order submission error:", error);
    }
  };

  // Show user agent setup if not created
  if (!isUserAgentCreated) {
    return (
      <div className="trading-panel space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Trading Setup Required
        </h3>
        <UserAgentSetup />
      </div>
    );
  }

  return (
    <div className="trading-panel">
      {/* Order Type Tabs */}
      <Tabs
        value={orderData.orderType}
        onValueChange={(value: string) =>
          handleOrderTypeChange(value as "market" | "limit" | "pro")
        }
      >
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="limit">Limit</TabsTrigger>
          <Popover>
            <PopoverTrigger className="border-b-2 border-b-gray-600 py-1.5 px-3 text-sm">
              Pro
            </PopoverTrigger>
            <PopoverContent>Coming soon...</PopoverContent>
          </Popover>
        </TabsList>

        {/* Buy/Sell Toggle */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <Button
            variant={orderData.side === "buy" ? "default" : "outline"}
            onClick={() => handleSideChange("buy")}
            className={`buy-button ${
              orderData.side === "buy"
                ? ""
                : "border-gray-600 text-gray-300 hover:bg-teal-600/20"
            }`}
          >
            Buy
          </Button>
          <Button
            variant={orderData.side === "sell" ? "default" : "outline"}
            onClick={() => handleSideChange("sell")}
            className={`sell-button ${
              orderData.side === "sell"
                ? ""
                : "border-gray-600 text-gray-300 hover:bg-red-600/20"
            }`}
          >
            Sell
          </Button>
        </div>

        <TabsContent value="market" className="space-y-4">
          <MarketOrderForm
            orderData={orderData}
            setOrderData={setOrderData}
            percentageAmount={percentageAmount}
            setPercentageAmount={setPercentageAmount}
            handlePercentageClick={handlePercentageClick}
          />
        </TabsContent>

        <TabsContent value="limit" className="space-y-4">
          <LimitOrderForm
            orderData={orderData}
            setOrderData={setOrderData}
            percentageAmount={percentageAmount}
            setPercentageAmount={setPercentageAmount}
            handlePercentageClick={handlePercentageClick}
          />
        </TabsContent>
      </Tabs>

      {/* Available Balance */}
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-gray-400">Available to Trade</span>
        <span className="text-white">
          {balanceData?.availableBalance || "0.00"} USDC
        </span>
      </div>

      {/* Order Summary */}
      <div className="space-y-2 text-sm mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Order Value</span>
          <span className="text-white">
            {calculateOrderValue() === "0.00"
              ? "N/A"
              : `$${calculateOrderValue()}`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Slippage</span>
          <span className="text-white">
            Est: {estimatedSlippage()} / Max: {orderData.slippage}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">Fees</span>
            <Info className="h-3 w-3 text-gray-400" />
          </div>
          <span className="text-white">0.0700% / 0.0400%</span>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        className={`w-full h-12 font-semibold ${
          orderData.side === "buy" ? "buy-button" : "sell-button"
        }`}
        disabled={
          !orderData.size || parseFloat(orderData.size) <= 0 || isTrading
        }
        onClick={handleSubmitOrder}
      >
        {isTrading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
            {isPlacingMarketOrder
              ? "Placing Market Order..."
              : isPlacingLimitOrder
              ? "Placing Limit Order..."
              : "Processing..."}
          </>
        ) : (
          `${orderData.side === "buy" ? "Buy" : "Sell"} ${selectedSymbol}`
        )}
      </Button>
    </div>
  );
}

function MarketOrderForm({
  orderData,
  setOrderData,
  percentageAmount,
  setPercentageAmount,
  handlePercentageClick,
}: {
  orderData: OrderFormData;
  setOrderData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  percentageAmount: number[];
  setPercentageAmount: React.Dispatch<React.SetStateAction<number[]>>;
  handlePercentageClick: (percentage: number) => void;
}) {
  const { selectedSymbol } = useAppData();
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="size" className="text-gray-300">
          Size
        </Label>
        <div className="relative">
          <Input
            id="size"
            placeholder="0"
            value={orderData.size}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setOrderData((prev) => ({ ...prev, size: e.target.value }))
            }
            className="bg-gray-800 border-gray-600 text-white pr-16"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {selectedSymbol}
          </div>
        </div>
      </div>

      {/* Percentage Slider */}
      <div className="space-y-3">
        <Slider
          value={percentageAmount}
          onValueChange={setPercentageAmount}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex items-center justify-between text-xs">
          {[0, 25, 50, 75, 100].map((percentage) => (
            <Button
              key={percentage}
              variant="ghost"
              size="sm"
              onClick={() => handlePercentageClick(percentage)}
              className="h-6 px-2 text-xs text-gray-400 hover:text-white"
            >
              {percentage}%
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}

function LimitOrderForm(props: {
  orderData: OrderFormData;
  setOrderData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  percentageAmount: number[];
  setPercentageAmount: React.Dispatch<React.SetStateAction<number[]>>;
  handlePercentageClick: (percentage: number) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="limit-price" className="text-gray-300">
          Price
        </Label>
        <Input
          id="limit-price"
          placeholder="44.477"
          value={props.orderData.price}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            props.setOrderData((prev: OrderFormData) => ({
              ...prev,
              price: e.target.value,
            }))
          }
          className="bg-gray-800 border-gray-600 text-white"
        />
      </div>
      <MarketOrderForm {...props} />
    </>
  );
}

function ProOrderForm(props: {
  orderData: OrderFormData;
  setOrderData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  percentageAmount: number[];
  setPercentageAmount: React.Dispatch<React.SetStateAction<number[]>>;
  handlePercentageClick: (percentage: number) => void;
}) {
  return (
    <>
      <LimitOrderForm {...props} />
      <div className="space-y-2">
        <Label htmlFor="stop-loss" className="text-gray-300">
          Stop Loss
        </Label>
        <Input
          id="stop-loss"
          placeholder="Optional"
          className="bg-gray-800 border-gray-600 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="take-profit" className="text-gray-300">
          Take Profit
        </Label>
        <Input
          id="take-profit"
          placeholder="Optional"
          className="bg-gray-800 border-gray-600 text-white"
        />
      </div>
    </>
  );
}
