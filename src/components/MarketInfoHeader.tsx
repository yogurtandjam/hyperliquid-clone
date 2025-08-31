"use client";

import { useEffect, useMemo, useState } from "react";
import { TickerSelector } from "@/components/TickerSelector";
import { useMarketData } from "@/contexts/MarketDataContext";
import { subscriptionClient, formatters } from "@/services/hyperliquidApi";

const num = (v: unknown): number | undefined => {
  if (v == null) return undefined;
  const x =
    typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(x) ? x : undefined;
};

type MarketCtx = {
  funding?: number;
  openInterestBase?: number;
  prevDayPx?: number;
  dayNtlVlm?: number;
  premium?: number;
  oraclePx?: number;
  markPx?: number;
  midPx?: number;
  impactPxs?: number[];
};

const normalizeCtx = (raw: any): MarketCtx => {
  const r = raw?.ctx ?? raw;
  return {
    funding: num(r.funding),
    openInterestBase: num(r.openInterest),
    prevDayPx: num(r.prevDayPx),
    dayNtlVlm: num(r.dayNtlVlm),
    premium: num(r.premium),
    oraclePx: num(r.oraclePx),
    markPx: num(r.markPx),
    midPx: num(r.midPx),
  };
};

export function MarketInfoHeader() {
  const { selectedSymbol } = useMarketData();

  const [mark, setMark] = useState<number | undefined>();
  const [oracle, setOracle] = useState<number | undefined>();
  const [changeAbs, setChangeAbs] = useState<number | undefined>();
  const [changePct, setChangePct] = useState<number | undefined>();
  const [vol24h, setVol24h] = useState<number | undefined>();
  const [openInterest, setOpenInterest] = useState<number | undefined>();
  const [fundingRate, setFundingRate] = useState<number | undefined>();
  const [nextFundingMs, setNextFundingMs] = useState<number | undefined>();
  const [nowMs, setNowMs] = useState(Date.now());

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to market context for the selected symbol
  useEffect(() => {
    if (!selectedSymbol) return;
    let unsub: null | (() => Promise<void>) = null;

    subscriptionClient
      .activeAssetCtx({ coin: selectedSymbol }, (payload: any) => {
        const c = normalizeCtx(payload);

        // Primary fields
        if (c.markPx !== undefined) setMark(c.markPx);
        if (c.oraclePx !== undefined) setOracle(c.oraclePx);

        // 24h change from prevDayPx
        if (c.prevDayPx !== undefined && c.markPx !== undefined) {
          const abs = c.markPx - c.prevDayPx;
          setChangeAbs(abs);
          setChangePct(c.prevDayPx !== 0 ? abs / c.prevDayPx : undefined);
        }

        // 24h volume
        if (c.dayNtlVlm !== undefined) setVol24h(c.dayNtlVlm);

        // Open interest (convert base units to USD)
        const px = c.oraclePx ?? c.markPx;
        if (c.openInterestBase !== undefined && px !== undefined) {
          setOpenInterest(c.openInterestBase * px);
        }

        // Funding rate
        if (c.funding !== undefined) setFundingRate(c.funding);
      })
      .then((s) => (unsub = s.unsubscribe))
      .catch((error) =>
        console.error("Error subscribing to activeAssetCtx:", error),
      );

    return () => {
      if (unsub) unsub();
    };
  }, [selectedSymbol]);

  const countdownMs = useMemo(
    () => (nextFundingMs != null ? nextFundingMs - nowMs : undefined),
    [nextFundingMs, nowMs],
  );

  return (
    <div className="trading-panel flex">
      {/* Ticker Selector */}
      <TickerSelector />

      {/* Market Data Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-1 text-sm">
        <Stat
          label="Mark Price"
          value={mark ? `$${formatters.formatPrice(mark.toString())}` : "—"}
        />

        <Stat
          label="Oracle Price"
          value={oracle ? `$${formatters.formatPrice(oracle.toString())}` : "—"}
        />

        <Stat
          label="24h Change"
          value={
            changeAbs == null || changePct == null
              ? "—"
              : `${changeAbs >= 0 ? "+" : ""}${formatters.formatPriceChange(
                  changeAbs.toString(),
                )} / ${formatters.formatPercentageChange(
                  (changePct * 100).toString(),
                )}`
          }
          colored={changeAbs}
        />

        <Stat
          label="24h Volume"
          value={vol24h ? `$${formatters.formatVolume(vol24h)}` : "—"}
        />

        <Stat
          label="Open Interest"
          value={
            openInterest ? `$${formatters.formatVolume(openInterest)}` : "—"
          }
        />

        <Stat
          label="Funding Rate"
          value={fundingRate ? `${(fundingRate * 100).toFixed(4)}%` : "—"}
          colored={fundingRate}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  colored,
}: {
  label: string;
  value: string;
  colored?: number;
}) {
  const isPos = (colored ?? 0) > 0;
  const isNeg = (colored ?? 0) < 0;

  return (
    <div className="flex flex-col">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div
        className={`font-semibold ${
          isPos ? "text-teal-400" : isNeg ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
