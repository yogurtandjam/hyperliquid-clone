"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Key,
  User,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useUserAgent } from "@/hooks/useUserAgent";
import { useAccount, useSignMessage } from "wagmi";

/**
 * Updated to align with HL frontend behavior + server registration:
 * - No master PK collection. Uses connected wallet for auth via signature.
 * - Persists agent PK locally.
 * - Calls HL API to register the agent so it appears on their API page.
 * - Adds Reset/Force Reset buttons to recover from a stuck state.
 */
export function UserAgentSetup() {
  const [agentName, setAgentName] = useState("");
  const [agentPrivateKey, setAgentPrivateKey] = useState("");
  const [showAgentKey, setShowAgentKey] = useState(false);

  const { address, isConnected } = useAccount();

  const {
    userAgentState,
    isUserAgentCreated,
    createUserAgent,
    setExistingUserAgent,
    clearUserAgent,
    isCreatingUserAgent,
    createUserAgentError,
  } = useUserAgent();

  const isValidHexPk = useCallback(
    (v: string) => v.startsWith("0x") && v.length === 66,
    [],
  );

  const disablePrimaryActions = useMemo(() => {
    return (
      !isConnected ||
      !address ||
      !agentName.trim() ||
      !agentPrivateKey.trim() ||
      !isValidHexPk(agentPrivateKey.trim()) ||
      isCreatingUserAgent
    );
  }, [
    isConnected,
    address,
    agentName,
    agentPrivateKey,
    isCreatingUserAgent,
    isValidHexPk,
  ]);

  const generateAgentPrivateKey = () => {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setAgentPrivateKey(("0x" + hex) as `0x${string}`);
  };

  const handleCreateAgent = async () => {
    try {
      const agentKey = agentPrivateKey.trim();
      if (!isValidHexPk(agentKey)) {
        alert(
          "Agent private key must be a valid 64-character hex string starting with 0x",
        );
        return;
      }
      // 1) Persist locally (HL-style)
      await createUserAgent({
        agentName: agentName.trim(),
        agentPkOverride: agentKey as `0x${string}`,
      });
    } catch (err) {
      console.error("Create agent failed", err);
      clearUserAgent();
    }
  };

  const handleSetExistingAgent = async () => {
    try {
      const agentKey = agentPrivateKey.trim();
      if (!isValidHexPk(agentKey)) {
        alert(
          "Agent private key must be a valid 64-character hex string starting with 0x",
        );
        return;
      }
      await setExistingUserAgent(agentName.trim(), agentKey as `0x${string}`);
    } catch (err) {
      console.error("Connect agent failed", err);
    }
  };

  if (isUserAgentCreated && userAgentState.agentName) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-500" />
            <span>User Agent Active</span>
          </CardTitle>
          <CardDescription>
            Your trading agent is ready to execute orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">
                Agent Name: {userAgentState.agentName}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              onClick={clearUserAgent}
              className="w-full"
            >
              Disconnect Agent
            </Button>
            {/* Force Reset option in case UI is stuck */}
            <Button
              variant="ghost"
              onClick={clearUserAgent}
              className="w-full text-red-600"
            >
              Force Reset (Clear Local Agent)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5" />
          <span>User Agent Setup</span>
        </CardTitle>
        <CardDescription>
          Create or connect a trading agent for on-chain order execution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {createUserAgentError && (
          <Alert variant="destructive">
            <AlertDescription>
              {createUserAgentError.message?.includes(
                "Must deposit before performing actions",
              )
                ? "You must deposit funds to your Hyperliquid account before creating a user agent. Please visit the Hyperliquid app to make a deposit first."
                : createUserAgentError.message || "Failed to create user agent"}
            </AlertDescription>
          </Alert>
        )}

        {/* Wallet status */}
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="h-4 w-4" />
          {isConnected && address ? (
            <span className="truncate">Connected: {address}</span>
          ) : (
            <span className="text-red-600">
              Connect your wallet to continue
            </span>
          )}
        </div>

        {/* Agent Name */}
        <div className="space-y-2">
          <Label htmlFor="agentName">Agent Name</Label>
          <Input
            id="agentName"
            placeholder="e.g., MyTradingBot"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            disabled={isCreatingUserAgent}
            autoComplete="off"
          />
        </div>

        {/* Agent Private Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="agentPk">Agent Private Key</Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateAgentPrivateKey}
                disabled={isCreatingUserAgent}
                className="h-8 px-2"
              >
                <RefreshCw className="mr-1 h-4 w-4" /> Generate
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAgentKey((s) => !s)}
                disabled={isCreatingUserAgent}
                className="h-8 px-2"
              >
                {showAgentKey ? (
                  <span className="inline-flex items-center">
                    <EyeOff className="mr-1 h-4 w-4" /> Hide
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    <Eye className="mr-1 h-4 w-4" /> Show
                  </span>
                )}
              </Button>
            </div>
          </div>
          <Input
            id="agentPk"
            type={showAgentKey ? "text" : "password"}
            placeholder="0x..."
            value={agentPrivateKey}
            onChange={(e) => setAgentPrivateKey(e.target.value)}
            disabled={isCreatingUserAgent}
            autoComplete="off"
          />
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your wallet authorizes agent actions via signature. Your agent
            private key is managed locally and never sent to our servers.
            <br />
            <br />
            <strong>Note:</strong> You must have funds deposited in your
            Hyperliquid account before you can create or approve a user agent.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button
            onClick={handleCreateAgent}
            disabled={disablePrimaryActions}
            className="w-full"
          >
            {isCreatingUserAgent ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Agent...
              </>
            ) : (
              "Create New Agent"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleSetExistingAgent}
            disabled={disablePrimaryActions}
            className="w-full"
          >
            Connect Existing Agent
          </Button>

          {/* Escape hatch if a half-created local record blocks the flow */}
          <Button
            variant="ghost"
            onClick={clearUserAgent}
            className="w-full text-red-600"
          >
            Reset Local Agent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
