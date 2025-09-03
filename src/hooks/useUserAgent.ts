import {
  AGENT_PREFIX,
  DEFAULT_KEY,
  readAgentRecord,
  LAST_ACTIVE_VAULT,
} from "@/lib/utils";
import {
  createAgentExchangeClient,
  getAgentExchangeClient,
  hyperliquidApi,
} from "@/services/hyperliquidApi";
import { AgentRecord } from "@/types";
import * as hl from "@nktkas/hyperliquid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

export type UserAgentState = {
  agentName: string;
  owner: `0x${string}`;
  createdAt: number;
};

export type CreateUserAgentParams = {
  agentName: string;
  // if absent, we will generate one
  agentPkOverride?: `0x${string}`;
};

export type UseUserAgentReturn = {
  userAgentState: Partial<UserAgentState>;
  isUserAgentCreated: boolean;
  isCreatingUserAgent: boolean;
  createUserAgentError?: Error;
  // Frontend-only create: persist local agent PK under hyperliquid_agent_<owner>
  createUserAgent: (params: CreateUserAgentParams) => Promise<void>;
  // Frontend-only connect: store provided PK locally
  setExistingUserAgent: (
    agentName: string,
    agentPkOverride: `0x${string}`,
  ) => Promise<void>;
  clearUserAgent: () => void;
  // Build a fresh auth bundle for HL API calls (no persistence)
  getAuthBundle: () => Promise<{
    authMsg: string;
    authSig: `0x${string}`;
    ts: number;
    owner: `0x${string}`;
  }>;
  // Direct access to the stored agent record for current owner (if any)
  getLocalAgentRecord: () => AgentRecord | null;
  userAgentClient: hl.ExchangeClient;
};

// ===== Utilities =====
const isHex64 = (v: string) => v.startsWith("0x") && v.length === 66;

const generatePk = (): `0x${string}` => {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return ("0x" + hex) as `0x${string}`;
};

const buildAuthMessage = (
  agentName: string,
  owner: `0x${string}`,
  ts: number,
) =>
  [
    "Hyperliquid Agent Authorization",
    `Agent: ${agentName}`,
    `Owner: ${owner}`,
    `Timestamp: ${ts}`,
  ].join("");

const writeAgentRecord = (
  owner: `0x${string}` | "default",
  rec: AgentRecord,
) => {
  localStorage.setItem(`${AGENT_PREFIX}${owner}`, JSON.stringify(rec));
  // Maintain default for HL-style fallback (optional)
  localStorage.setItem(DEFAULT_KEY, JSON.stringify(rec));
};

// ===== Hook =====
export function useUserAgent(): UseUserAgentReturn {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [userAgentState, setUserAgentState] = useState<Partial<UserAgentState>>(
    {},
  );
  const [isCreatingUserAgent, setIsCreatingUserAgent] = useState(false);
  const [createUserAgentError, setCreateUserAgentError] = useState<
    Error | undefined
  >();

  // hydrate from localStorage when wallet changes
  useEffect(() => {
    if (!address) {
      setUserAgentState({});
      return;
    }
    const rec = readAgentRecord(address);
    if (rec && rec.userAddress !== "default") {
      setUserAgentState((prev) => ({
        ...prev,
        owner: rec.userAddress as `0x${string}`,
        // Keep last agentName if we know it; otherwise leave undefined until user sets
      }));
    }
  }, [address]);

  const isUserAgentCreated = useMemo(() => {
    if (!address) return false;
    const rec = readAgentRecord(address);
    return !!rec && rec.userAddress !== "default";
  }, [address]);

  const clearUserAgent = useCallback(() => {
    if (!address) return;
    // also nuke the default record HL uses for fallback
    localStorage.removeItem(DEFAULT_KEY);
    localStorage.removeItem(`${AGENT_PREFIX}${address}`);
    setUserAgentState({});
  }, [address]);

  const getLocalAgentRecord = useCallback((): AgentRecord | null => {
    return readAgentRecord(address);
  }, [address]);

  const getAuthBundle = useCallback(async () => {
    if (!isConnected || !address) throw new Error("Wallet not connected");
    const agentName = (userAgentState.agentName || "") as string;
    const name = agentName || "UnnamedAgent"; // fallback if not set yet
    const ts = Date.now();
    const message = buildAuthMessage(name, address as `0x${string}`, ts);
    const sig = await signMessageAsync({ message });
    return {
      authMsg: message,
      authSig: sig as `0x${string}`,
      ts,
      owner: address as `0x${string}`,
    };
  }, [address, isConnected, signMessageAsync, userAgentState.agentName]);

  const createUserAgent = useCallback(
    async ({ agentName, agentPkOverride }: CreateUserAgentParams) => {
      if (!isConnected || !address) throw new Error("Wallet not connected");
      setIsCreatingUserAgent(true);
      setCreateUserAgentError(undefined);
      try {
        const pk = agentPkOverride ?? generatePk();
        if (!isHex64(pk))
          throw new Error("Agent private key must be 0x + 64 hex chars");

        const rec: AgentRecord = {
          privateKey: pk,
          userAddress: address as `0x${string}`,
        };
        writeAgentRecord(address as `0x${string}`, rec);
        await hyperliquidApi.approveAgentWithWallet({
          ownerAddress: address,
          agentPk: pk,
          agentName,
        });

        // (Optional) mirror HL local flags
        localStorage.setItem(
          LAST_ACTIVE_VAULT,
          JSON.stringify({ [address as `0x${string}`]: null }),
        );

        setUserAgentState({
          agentName,
          owner: address as `0x${string}`,
          createdAt: Date.now(),
        });
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setCreateUserAgentError(e);
        clearUserAgent();
        throw e;
      } finally {
        setIsCreatingUserAgent(false);
      }
    },
    [address, clearUserAgent, isConnected],
  );

  const setExistingUserAgent = useCallback(
    async (agentName: string, agentPkOverride: `0x${string}`) => {
      if (!isConnected || !address) throw new Error("Wallet not connected");
      setIsCreatingUserAgent(true);
      setCreateUserAgentError(undefined);
      try {
        if (!isHex64(agentPkOverride))
          throw new Error("Agent private key must be 0x + 64 hex chars");
        const rec: AgentRecord = {
          privateKey: agentPkOverride,
          userAddress: address as `0x${string}`,
        };
        writeAgentRecord(address as `0x${string}`, rec);
        localStorage.setItem(
          LAST_ACTIVE_VAULT,
          JSON.stringify({ [address as `0x${string}`]: null }),
        );
        setUserAgentState({
          agentName,
          owner: address as `0x${string}`,
          createdAt: Date.now(),
        });
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setCreateUserAgentError(e);
        throw e;
      } finally {
        setIsCreatingUserAgent(false);
      }
    },
    [address, isConnected],
  );

  const userAgentClient = useMemo((): hl.ExchangeClient => {
    if (!isUserAgentCreated) {
      console.error("No local user agent found. Create or connect one first.");
    }

    const rec = readAgentRecord(address);
    if (!rec?.privateKey) {
      throw new Error("Missing agent private key in local storage.");
    }

    // Always create a fresh client with the current private key
    return createAgentExchangeClient({
      agentPrivateKey: rec.privateKey,
    });
  }, [address, isUserAgentCreated]);

  return {
    userAgentState,
    isUserAgentCreated,
    isCreatingUserAgent,
    createUserAgentError,
    createUserAgent,
    setExistingUserAgent,
    clearUserAgent,
    getAuthBundle,
    getLocalAgentRecord,
    userAgentClient,
  };
}
