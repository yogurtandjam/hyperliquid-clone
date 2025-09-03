"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { hyperliquidApi, createTradingClient } from "@/services/hyperliquidApi";
import { Address } from "viem";

export type UserAgentState = {
  isCreated: boolean;
  agentName: string | null;
  privateKey: `0x${string}` | null;
};

export function useUserAgent() {
  const { user } = usePrivy();
  const [userAgentState, setUserAgentState] = useState<UserAgentState>({
    isCreated: false,
    agentName: null,
    privateKey: null,
  });

  // Initialize trading client with private key
  const initializeTradingClient = useCallback((privateKey: `0x${string}`) => {
    try {
      createTradingClient(privateKey);
      console.log("✅ Trading client initialized");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize trading client:", error);
      return false;
    }
  }, []);

  // Mutation for creating user agent (approve agent with generated address)
  const createUserAgentMutation = useMutation({
    mutationFn: async ({
      agentName,
      privateKey,
    }: {
      agentName: string;
      privateKey: Address;
    }) => {
      // Initialize trading client first
      if (!initializeTradingClient(privateKey)) {
        throw new Error("Failed to initialize trading client");
      }

      // For now, we'll use the wallet address as the agent address
      // In a real implementation, you might want to generate a separate agent address
      const agentAddress =
        user?.wallet?.address || "0x0000000000000000000000000000000000000000";

      // Approve the agent on-chain
      const result = await hyperliquidApi.approveAgent(
        agentAddress as Address,
        agentName,
      );

      return { result, agentName, privateKey };
    },
    onSuccess: ({ agentName, privateKey }) => {
      setUserAgentState({
        isCreated: true,
        agentName,
        privateKey,
      });
      console.log("✅ User agent created successfully:", agentName);
    },
    onError: (error) => {
      console.error("❌ Failed to create user agent:", error);
    },
  });

  // Function to set existing user agent (if user already has one)
  const setExistingUserAgent = useCallback(
    (agentName: string, privateKey: `0x${string}`) => {
      if (initializeTradingClient(privateKey)) {
        setUserAgentState({
          isCreated: true,
          agentName,
          privateKey,
        });
      }
    },
    [initializeTradingClient],
  );

  // Function to clear user agent
  const clearUserAgent = useCallback(() => {
    setUserAgentState({
      isCreated: false,
      agentName: null,
      privateKey: null,
    });
  }, []);

  return {
    // State
    userAgentState,
    isUserAgentCreated: userAgentState.isCreated,

    // Actions
    createUserAgent: createUserAgentMutation.mutate,
    setExistingUserAgent,
    clearUserAgent,

    // Status
    isCreatingUserAgent: createUserAgentMutation.isPending,
    createUserAgentError: createUserAgentMutation.error,
  };
}
