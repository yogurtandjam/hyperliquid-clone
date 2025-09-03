"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  CandlestickData,
  Time,
  ISeriesApi,
  HistogramData,
} from "lightweight-charts";
import { subscriptionClient, infoClient } from "@/services/hyperliquidApi";
import { formatters } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/custom-tabs";
import {
  BarChart3,
  TrendingUp,
  Settings,
  Maximize,
  Search,
  Volume2,
  CandlestickChart,
} from "lucide-react";
import { Candle } from "@nktkas/hyperliquid";
import { useAppData } from "@/contexts/AppContext";

/* ---------------- Types ---------------- */
type TFKey =
  | "5Y_1W"
  | "1Y_1W"
  | "6M_2H"
  | "3M_1H"
  | "1M_30M"
  | "5D_5M"
  | "1D_1M";
type HLInterval = "1m" | "5m" | "30m" | "1h" | "2h" | "1w";
type VisibleRange = { from: Time; to: Time } | null;

const TF: Record<
  TFKey,
  { label: string; interval: HLInterval; lookbackMs: number }
> = {
  "5Y_1W": {
    label: "5y",
    interval: "1w",
    lookbackMs: 1000 * 60 * 60 * 24 * 7 * 52 * 5,
  },
  "1Y_1W": {
    label: "1y",
    interval: "1w",
    lookbackMs: 1000 * 60 * 60 * 24 * 7 * 52,
  },
  "6M_2H": {
    label: "6m",
    interval: "2h",
    lookbackMs: 1000 * 60 * 60 * 24 * 30 * 6,
  },
  "3M_1H": {
    label: "3m",
    interval: "1h",
    lookbackMs: 1000 * 60 * 60 * 24 * 30 * 3,
  },
  "1M_30M": {
    label: "1m",
    interval: "30m",
    lookbackMs: 1000 * 60 * 60 * 24 * 30,
  },
  "5D_5M": { label: "5d", interval: "5m", lookbackMs: 1000 * 60 * 60 * 24 * 5 },
  "1D_1M": { label: "1d", interval: "1m", lookbackMs: 1000 * 60 * 60 * 24 },
};
const ORDER: TFKey[] = [
  "5Y_1W",
  "1Y_1W",
  "6M_2H",
  "3M_1H",
  "1M_30M",
  "5D_5M",
  "1D_1M",
];

const INTERVAL_MS: Record<HLInterval, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "30m": 1_800_000,
  "1h": 3_600_000,
  "2h": 7_200_000,
  "1w": 7 * 24 * 3_600_000,
};

// how many candles to fetch when extending left
const CHUNK_CANDLES = 1200;

/* ---------------- Helpers ---------------- */
function calcSeed(tf: TFKey) {
  const { lookbackMs, interval } = TF[tf];
  const endTime = Date.now();
  const startTime = endTime - lookbackMs;
  return { startTime, endTime, interval };
}

function mapCandles(rows: Candle[]): CandlestickData[] {
  return rows.map((c: Candle) => ({
    time: (c.t / 1000) as Time,
    open: Number(c.o),
    high: Number(c.h),
    low: Number(c.l),
    close: Number(c.c),
  }));
}

function mergeLeftUnique(
  existingAsc: CandlestickData[],
  olderAsc: CandlestickData[],
): CandlestickData[] {
  const seen = new Set(existingAsc.map((d) => Number(d.time)));
  const filteredOlder = olderAsc.filter((d) => !seen.has(Number(d.time)));
  return [...filteredOlder, ...existingAsc];
}

/* ---------------- Component ---------------- */
export const TradingChart = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<
    IChartApi["addCandlestickSeries"]
  > | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const { selectedSymbol } = useAppData();

  const [timeFrame, setTimeframe] = useState<TFKey>("1D_1M");
  const [isLoading, setIsLoading] = useState(true);
  const {
    startTime: seedStartMs,
    endTime: seedEndMs,
    interval,
  } = useMemo(() => calcSeed(timeFrame), [timeFrame]);

  // in-memory data + bounds
  const dataRef = useRef<CandlestickData[]>([]);
  const fetchingOlder = useRef(false);
  const lastExtendAt = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: "#0f1a1f" }, textColor: "#E8EDF2" },
      grid: {
        horzLines: {
          visible: true,
          color: "rgba(128, 128, 128, 0.1)",
        },
        vertLines: {
          visible: true,
          color: "rgba(128, 128, 128, 0.1)",
        },
      },
      crosshair: { mode: 0 },
      leftPriceScale: {
        borderVisible: false,
        visible: true,
      },
      rightPriceScale: {
        borderVisible: false,
        visible: false,
      },
      timeScale: { borderVisible: false, timeVisible: true },
    });

    const series = chart.addCandlestickSeries({
      priceScaleId: "left",
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = null; // Remove volume series for now

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [selectedSymbol]);

  // Seed + WS subscribe when coin/timeframe changes
  useEffect(() => {
    if (!selectedSymbol || !seriesRef.current) return;

    let cancelled = false;

    // reset local cache
    dataRef.current = [];

    async function seedInitial() {
      if (!selectedSymbol) return;
      try {
        setIsLoading(true);
        const rows = await infoClient.candleSnapshot({
          coin: selectedSymbol,
          interval,
          startTime: seedStartMs,
          endTime: seedEndMs,
        });
        if (cancelled) return;
        const mapped = mapCandles(rows);
        dataRef.current = mapped;
        seriesRef.current!.setData(mapped);
        // Auto-fit the chart to show all data
        chartRef.current?.timeScale().fitContent();
        setIsLoading(false);
      } catch (e) {
        if (!cancelled) {
          seriesRef.current!.setData([]);
          setIsLoading(false);
        }
      }
    }

    async function subscribeWS() {
      if (!selectedSymbol) return;
      const sub = await subscriptionClient.candle(
        { coin: selectedSymbol, interval },
        (candle) => {
          const currentCandleStartInMs = Number(candle.t);
          const lastMs = dataRef.current.length
            ? Number(dataRef.current[dataRef.current.length - 1].time) * 1000
            : 0;
          if (currentCandleStartInMs >= lastMs) {
            const currentCandleStartInSeconds = Math.floor(
              currentCandleStartInMs / 1000,
            );
            const next = {
              time: currentCandleStartInSeconds as Time,
              open: Number(candle.o),
              high: Number(candle.h),
              low: Number(candle.l),
              close: Number(candle.c),
            };
            const latestCandle = dataRef.current[dataRef.current.length - 1];
            const latestCandleStartInSec = latestCandle
              ? Number(latestCandle.time)
              : -1;
            // if this candle is the latest candle, update it instead of generating a new one
            if (latestCandleStartInSec === currentCandleStartInSeconds) {
              dataRef.current[dataRef.current.length - 1] = next;
              seriesRef.current?.update(next);
            } else {
              dataRef.current.push(next);
              seriesRef.current?.update(next);
            }
          }
        },
      );
      return () => {
        void sub.unsubscribe();
      };
    }

    function attachLeftExtendHandler() {
      const chart = chartRef.current!;
      const msPerBar = INTERVAL_MS[interval];
      const marginMs = msPerBar * 50; // fetch when within 50 bars of the left edge

      const handler = async (range: VisibleRange) => {
        if (!range || fetchingOlder.current) return;

        // derive current earliest from buffer
        const first = dataRef.current.length
          ? Number(dataRef.current[0].time) * 1000
          : null;
        if (first == null) return;

        const fromMs = Number(range.from) * 1000;

        // Only extend when the user nears the left boundary
        if (fromMs <= first + marginMs) {
          const now = Date.now();
          if (now - lastExtendAt.current < 500) return; // throttle while dragging
          lastExtendAt.current = now;
          await fetchOlderChunk(first);
        }
      };

      chart.timeScale().subscribeVisibleTimeRangeChange(handler);

      // return a detach fn so caller can unsubscribe on cleanup
      return () => chart.timeScale().unsubscribeVisibleTimeRangeChange(handler);
    }

    async function fetchOlderChunk(currentEarliestMs: number) {
      if (fetchingOlder.current) return;
      if (!selectedSymbol) return;
      fetchingOlder.current = true;
      try {
        const stepMs = INTERVAL_MS[interval] * CHUNK_CANDLES;
        const olderEnd = currentEarliestMs - 1; // avoid overlap
        const olderStart = Math.max(0, olderEnd - stepMs);

        const rows = await infoClient.candleSnapshot({
          coin: selectedSymbol,
          interval,
          startTime: olderStart,
          endTime: olderEnd,
        });
        if (!rows?.length) return;

        const older = mapCandles(rows);
        const merged = mergeLeftUnique(dataRef.current, older);
        dataRef.current = merged;
        seriesRef.current!.setData(merged);
      } finally {
        fetchingOlder.current = false;
      }
    }

    let stopScrollCb: () => void;
    let stopWsCb: (() => void) | undefined;

    async function start() {
      await seedInitial();
      if (cancelled) return;

      // 2) subscribe WS
      const stopWS = await subscribeWS();
      if (cancelled) {
        stopWS?.();
        return;
      }

      // 3) attach left-extend handler
      stopScrollCb = attachLeftExtendHandler();
      stopWsCb = stopWS;
    }

    start();

    return () => {
      cancelled = true;
      stopWsCb?.();
      stopScrollCb?.();
    };
  }, [selectedSymbol, interval, seedStartMs, seedEndMs]);

  // const currentPrice = marketData[selectedSymbol]?.price || "0";
  // const currentCandle = dataRef.current[dataRef.current.length - 1];
  // const priceChange = currentCandle
  //   ? currentCandle.close - currentCandle.open
  //   : 0;
  // const priceChangePercent =
  //   currentCandle && currentCandle.open > 0
  //     ? (priceChange / currentCandle.open) * 100
  //     : 0;

  /* ---------- UI ---------- */
  return (
    <div className="trading-panel h-full flex flex-col">
      {/* Chart Container */}

      <div ref={containerRef} className="flex-1 bg-gray-900/30 rounded" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-2"></div>
            <p className="text-gray-400">Loading chart data...</p>
          </div>
        </div>
      )}
      {/* Chart Footer */}
      <div>
        <Tabs
          value={timeFrame}
          onValueChange={(value) => setTimeframe(value as TFKey)}
        >
          <TabsList className=" h-8">
            {ORDER.map((k) => (
              <TabsTrigger
                key={k}
                value={k}
                className="text-xs px-2 py-1 data-[state=active]:bg-teal-600"
                title={`${TF[k].label} • ${TF[k].interval}`}
              >
                {TF[k].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};
