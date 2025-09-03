"use client";

import { useMutation } from "@tanstack/react-query";
import {
  createAgentExchangeClient,
  hyperliquidApi,
} from "@/services/hyperliquidApi";
import { useEffect } from "react";
import { useUserAgent } from "./useUserAgent";
import { useAppData } from "@/contexts/AppContext";

export type MarketOrderParams = {
  asset: number;
  is_buy: boolean;
  sz: string;
  reduce_only?: boolean;
};

export type LimitOrderParams = {
  asset: number;
  is_buy: boolean;
  sz: string;
  limit_px: string;
  tif?: "Alo" | "Ioc" | "Gtc";
  reduce_only?: boolean;
};

export function useTrading() {
  const { userAgentClient } = useUserAgent();
  const { orderBook } = useAppData();
  // Market order mutation
  const marketOrderMutation = useMutation({
    mutationFn: async ({
      asset,
      is_buy,
      sz,
      reduce_only = false,
    }: MarketOrderParams) => {
      const price = orderBook?.asks[0].price;
      console.log("price", price);
      if (!price) return;
      return await hyperliquidApi.placeMarketOrder(
        userAgentClient,
        asset,
        is_buy,
        sz,
        reduce_only,
        price,
      );
    },
    onSuccess: (data, variables) => {
      console.log(
        `✅ Market order placed: ${variables.is_buy ? "BUY" : "SELL"} ${
          variables.sz
        } asset ${variables.asset}`,
      );
    },
    onError: (error, variables) => {
      console.error(
        `❌ Market order failed: ${variables.is_buy ? "BUY" : "SELL"} ${
          variables.sz
        } asset ${variables.asset}`,
        error,
      );
    },
  });

  // Limit order mutation
  const limitOrderMutation = useMutation({
    mutationFn: async ({
      asset,
      is_buy,
      sz,
      limit_px,
      tif = "Gtc",
      reduce_only = false,
    }: LimitOrderParams) => {
      return await hyperliquidApi.placeLimitOrder(
        userAgentClient,
        asset,
        is_buy,
        sz,
        limit_px,
        tif,
        reduce_only,
      );
    },
    onSuccess: (data, variables) => {
      console.log(
        `✅ Limit order placed: ${variables.is_buy ? "BUY" : "SELL"} ${
          variables.sz
        } asset ${variables.asset} @ ${variables.limit_px}`,
      );
    },
    onError: (error, variables) => {
      console.error(
        `❌ Limit order failed: ${variables.is_buy ? "BUY" : "SELL"} ${
          variables.sz
        } asset ${variables.asset}`,
        error,
      );
    },
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ asset, oid }: { asset: number; oid: number }) => {
      return await hyperliquidApi.cancelOrder(userAgentClient, asset, oid);
    },
    onSuccess: (data, variables) => {
      console.log(
        `✅ Order cancelled: ${variables.oid} for asset ${variables.asset}`,
      );
    },
    onError: (error, variables) => {
      console.error(
        `❌ Cancel order failed: ${variables.oid} for asset ${variables.asset}`,
        error,
      );
    },
  });

  // Cancel all orders mutation
  const cancelAllOrdersMutation = useMutation({
    mutationFn: async (asset?: number) => {
      return await hyperliquidApi.cancelAllOrders(userAgentClient, asset);
    },
    onSuccess: (data, variables) => {
      console.log(
        `✅ All orders cancelled${variables ? ` for asset ${variables}` : ""}`,
      );
    },
    onError: (error, variables) => {
      console.error(
        `❌ Cancel all orders failed${
          variables ? ` for asset ${variables}` : ""
        }`,
        error,
      );
    },
  });

  return {
    // Market Order
    placeMarketOrder: marketOrderMutation.mutate,
    isPlacingMarketOrder: marketOrderMutation.isPending,
    marketOrderError: marketOrderMutation.error,
    marketOrderData: marketOrderMutation.data,

    // Limit Order
    placeLimitOrder: limitOrderMutation.mutate,
    isPlacingLimitOrder: limitOrderMutation.isPending,
    limitOrderError: limitOrderMutation.error,
    limitOrderData: limitOrderMutation.data,

    // Cancel Order
    cancelOrder: cancelOrderMutation.mutate,
    isCancellingOrder: cancelOrderMutation.isPending,
    cancelOrderError: cancelOrderMutation.error,

    // Cancel All Orders
    cancelAllOrders: cancelAllOrdersMutation.mutate,
    isCancellingAllOrders: cancelAllOrdersMutation.isPending,
    cancelAllOrdersError: cancelAllOrdersMutation.error,

    // General status
    isTrading: marketOrderMutation.isPending || limitOrderMutation.isPending,
  };
}
