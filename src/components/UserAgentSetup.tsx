"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Key, User, Shield } from "lucide-react";
import { useUserAgent } from "@/hooks/useUserAgent";

export function UserAgentSetup() {
  const [agentName, setAgentName] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const {
    userAgentState,
    isUserAgentCreated,
    createUserAgent,
    setExistingUserAgent,
    clearUserAgent,
    isCreatingUserAgent,
    createUserAgentError,
  } = useUserAgent();

  const handleCreateAgent = () => {
    if (!agentName.trim() || !privateKey.trim()) {
      return;
    }
    const key = privateKey.trim();
    if (!key.startsWith('0x') || key.length !== 66) {
      alert('Private key must be a valid 64-character hex string starting with 0x');
      return;
    }
    createUserAgent({ agentName: agentName.trim(), privateKey: key as `0x${string}` });
  };

  const handleSetExistingAgent = () => {
    if (!agentName.trim() || !privateKey.trim()) {
      return;
    }
    const key = privateKey.trim();
    if (!key.startsWith('0x') || key.length !== 66) {
      alert('Private key must be a valid 64-character hex string starting with 0x');
      return;
    }
    setExistingUserAgent(agentName.trim(), key as `0x${string}`);
  };

  const generatePrivateKey = () => {
    // Generate a random 64-character hex private key
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const privateKey = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setPrivateKey('0x' + privateKey as `0x${string}`);
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
          
          <Button 
            variant="outline" 
            onClick={clearUserAgent}
            className="w-full"
          >
            Disconnect Agent
          </Button>
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
              {createUserAgentError.message?.includes("Must deposit before performing actions") 
                ? "You must deposit funds to your Hyperliquid account before creating a user agent. Please visit the Hyperliquid app to make a deposit first."
                : createUserAgentError.message || "Failed to create user agent"}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="agentName">Agent Name</Label>
          <Input
            id="agentName"
            placeholder="e.g., MyTradingBot"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            disabled={isCreatingUserAgent}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="privateKey">Private Key</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={generatePrivateKey}
              disabled={isCreatingUserAgent}
            >
              Generate
            </Button>
          </div>
          <Input
            id="privateKey"
            type={showPrivateKey ? "text" : "password"}
            placeholder="0x..."
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            disabled={isCreatingUserAgent}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPrivateKey(!showPrivateKey)}
            className="text-xs"
          >
            {showPrivateKey ? "Hide" : "Show"} Private Key
          </Button>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your private key is stored locally and never sent to our servers. 
            Make sure to backup your private key securely.
            <br /><br />
            <strong>Note:</strong> You must have funds deposited in your Hyperliquid account 
            before you can create or approve a user agent.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button 
            onClick={handleCreateAgent}
            disabled={!agentName.trim() || !privateKey.trim() || isCreatingUserAgent}
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
            disabled={!agentName.trim() || !privateKey.trim() || isCreatingUserAgent}
            className="w-full"
          >
            Connect Existing Agent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}