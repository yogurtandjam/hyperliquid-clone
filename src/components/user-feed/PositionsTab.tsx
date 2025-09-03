"use client";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { hyperliquidApi } from "@/services/hyperliquidApi";
import { formatters } from "@/lib/utils";
import { getUserState, num } from "./shared";

type Pos = {
  coin: string;
  sz: number;
  entryPx?: number;
  pnlUsd?: number;
  liqPx?: number;
};

export function PositionsTab() {
  const { user } = usePrivy();
  const [rows, setRows] = useState<Pos[]>([]);

  useEffect(() => {
    if (!user?.wallet?.address) return;
    let cancelled = false;

    async function seed() {
      try {
        const resp = await hyperliquidApi.getUserState(user.wallet.address);
        // Try a few shapes
        const pos =
          resp?.positions ??
          resp?.account?.positions ??
          resp?.subaccounts?.[0]?.positions ??
          [];
        const mapped: Pos[] = pos.map((p: any) => ({
          coin: String(p.coin ?? p.asset ?? p.symbol),
          sz: num(p.sz ?? p.size) ?? 0,
          entryPx: num(p.entryPx ?? p.entryPrice),
          pnlUsd: num(p.unrealizedPnlUsd ?? p.upnlUsd ?? p.pnlUsd),
          liqPx: num(p.liqPx ?? p.liquidationPrice),
        }));
        if (!cancelled) setRows(mapped.filter((r) => r.sz !== 0));
      } catch {
        /* ignore */
      }
    }

    void seed();

    return () => {
      cancelled = true;
    };
  }, [user?.wallet?.address]);

  return (
    <div className="divide-y divide-border">
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-5 items-center gap-2 py-2 text-sm"
        >
          <div className="text-muted">{r.coin}</div>
          <div className="tabular-nums">{formatters.formatSize(r.sz)}</div>
          <div className="tabular-nums">
            {r.entryPx != null ? formatters.formatPrice(r.entryPx) : "—"}
          </div>
          <div className="tabular-nums">
            {r.pnlUsd != null ? `$${formatters.formatPrice(r.pnlUsd, 2)}` : "—"}
          </div>
          <div className="tabular-nums">
            {r.liqPx != null ? formatters.formatPrice(r.liqPx) : "—"}
          </div>
        </div>
      ))}
      {!rows.length && (
        <div className="text-center py-8 text-gray-400">No positions yet</div>
      )}
    </div>
  );
}
