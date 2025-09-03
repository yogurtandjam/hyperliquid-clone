"use client";

import { useEffect, useMemo, useState } from "react";
import { TickerSelector } from "@/components/TickerSelector";
import { useAppData } from "@/contexts/AppContext";
import { subscriptionClient } from "@/services/hyperliquidApi";
import { formatters, priceToWire, toNumSafe } from "@/lib/utils";
import { WsActiveAssetCtx } from "@nktkas/hyperliquid";

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

const normalizeCtx = (raw: WsActiveAssetCtx): MarketCtx => {
  const r = raw?.ctx ?? raw;
  return {
    funding: toNumSafe(r.funding),
    openInterestBase: toNumSafe(r.openInterest),
    prevDayPx: toNumSafe(r.prevDayPx),
    dayNtlVlm: toNumSafe(r.dayNtlVlm),
    premium: toNumSafe(r.premium),
    oraclePx: toNumSafe(r.oraclePx),
    markPx: toNumSafe(r.markPx),
    midPx: toNumSafe(r.midPx),
  };
};

export function MarketInfoHeader() {
  const { selectedSymbol, selectedAsset } = useAppData();

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
      .activeAssetCtx({ coin: selectedSymbol }, (payload) => {
        const c = normalizeCtx(payload);

        // Primary fields
        if (c.markPx !== undefined) setMark(c.markPx);
        if (c.oraclePx !== undefined) setOracle(c.oraclePx);

        // 24h change from prevDayPx
        if (c.prevDayPx !== undefined && c.markPx !== undefined) {
          const abs = c.markPx - c.prevDayPx;
          setChangeAbs(
            Number(
              formatters.formatPriceChange(
                priceToWire(abs, "perp", selectedAsset?.szDecimals),
              ),
            ),
          );
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
  }, [selectedAsset?.szDecimals, selectedSymbol]);

  const countdownMs = useMemo(
    () => (nextFundingMs != null ? nextFundingMs - nowMs : undefined),
    [nextFundingMs, nowMs],
  );
  return (
    <div className="trading-panel flex gap-3">
      {/* Ticker Selector */}
      <TickerSelector />

      {/* Market Data Stats */}
      <div className="flex text-sm overflow-x-auto gap-6">
        <Stat label="Mark" value={mark ? `$${mark.toString()}` : "—"} />

        <Stat label="Oracle" value={oracle ? `$${oracle.toString()}` : "—"} />

        <Stat
          label="24h Change"
          value={
            changeAbs == null || changePct == null
              ? "—"
              : `${changeAbs} / ${formatters.formatPercentageChange(
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

const Stat = ({
  label,
  value,
  colored,
}: {
  label: string;
  value: string;
  colored?: number;
}) => {
  const isPos = (colored ?? 0) > 0;
  const isNeg = (colored ?? 0) < 0;

  return (
    <div className="flex flex-col justify-center">
      <div className="text-xs text-gray-400 mb-1 text-nowrap">{label}</div>
      <div
        className={`text-xs text-nowrap ${
          isPos ? "text-teal-400" : isNeg ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
};
