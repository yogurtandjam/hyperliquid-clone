"use client";

import { useState } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Header } from "@/components/Header";
import { MarketInfoHeader } from "@/components/MarketInfoHeader";
import { TradingChart } from "@/components/TradingChart";
import { OrderBook } from "@/components/OrderBook";
import { TradingInterface } from "@/components/TradingInterface";
import { UserFeed } from "@/components/user-feed/UserFeed";
import { AccountEquity } from "@/components/AccountEquity";
import { MarketDataProvider } from "@/contexts/MarketDataContext";
import { WalletProvider } from "@/providers/WalletProvider";
import "react-grid-layout/css/styles.css";
// import "react-grid-layout/css/react-resizable.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

const COLS = { lg: 16, md: 12, sm: 6, xs: 4, xxs: 2 };

const ORDERBOOK_HEIGHT = 20;
const ORDERBOOK_WIDTH = 3;
const HEADER_HEIGHT = 3;
const CHART_WIDTH = 10;
const CHART_HEIGHT = ORDERBOOK_HEIGHT - HEADER_HEIGHT;

// Medium breakpoint variables (12 columns total)
const MD_CHART_WIDTH = 8;
const MD_TRADING_WIDTH = COLS.md - MD_CHART_WIDTH;
const MD_CHART_HEIGHT = 16;
const MD_USERFEED_HEIGHT = 8;

export default function TradingPage() {
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({
    lg: [
      {
        i: "marketInfo",
        x: 0,
        y: 0,
        w: CHART_WIDTH,
        h: HEADER_HEIGHT,
        minW: 4,
        minH: 1,
      },
      {
        i: "chart",
        x: 0,
        y: 2,
        w: CHART_WIDTH,
        h: CHART_HEIGHT,
        minW: 4,
        minH: 8,
      },
      {
        i: "orderbook",
        x: CHART_WIDTH,
        y: 0,
        w: ORDERBOOK_WIDTH,
        h: ORDERBOOK_HEIGHT,
        minW: 2,
        minH: 6,
      },
      {
        i: "trading",
        x: CHART_WIDTH + ORDERBOOK_WIDTH,
        y: 0,
        w: ORDERBOOK_WIDTH,
        h: ORDERBOOK_HEIGHT,
        minW: 2,
        minH: 6,
      },
      {
        i: "equity",
        x: CHART_WIDTH + ORDERBOOK_WIDTH,
        y: 8,
        w: ORDERBOOK_WIDTH,
        h: 10,
        minW: 2,
        minH: 3,
      },
      {
        i: "userfeed",
        x: 0,
        y: 14,
        w: CHART_WIDTH + ORDERBOOK_WIDTH,
        h: 8,
        minW: 4,
        minH: 4,
      },
    ],
    md: [
      {
        i: "marketInfo",
        x: 0,
        y: 0,
        w: MD_CHART_WIDTH,
        h: HEADER_HEIGHT,
        minW: 4,
        minH: 1,
      },
      {
        i: "chart",
        x: 0,
        y: HEADER_HEIGHT,
        w: MD_CHART_WIDTH,
        h: CHART_HEIGHT,
        minW: 4,
        minH: 8,
      },
      {
        i: "trading",
        x: MD_CHART_WIDTH,
        y: 0,
        w: MD_TRADING_WIDTH,
        h: ORDERBOOK_HEIGHT,
        minW: 2,
        minH: 4,
      },
      {
        i: "orderbook",
        x: MD_CHART_WIDTH,
        y: ORDERBOOK_HEIGHT,
        w: MD_TRADING_WIDTH,
        h: ORDERBOOK_HEIGHT,
        minW: 2,
        minH: 3,
      },
      {
        i: "equity",
        x: MD_CHART_WIDTH,
        y: ORDERBOOK_HEIGHT + ORDERBOOK_HEIGHT,
        w: MD_TRADING_WIDTH,
        h: ORDERBOOK_HEIGHT,
        minW: 2,
        minH: 2,
      },
      {
        i: "userfeed",
        x: 0,
        y: HEADER_HEIGHT + MD_CHART_HEIGHT,
        w: MD_CHART_WIDTH,
        h: MD_USERFEED_HEIGHT,
        minW: 4,
        minH: 4,
      },
    ],
    sm: [
      { i: "marketInfo", x: 0, y: 0, w: 6, h: 2, minW: 4, minH: 1 },
      { i: "chart", x: 0, y: 2, w: 6, h: 8, minW: 4, minH: 6 },
      { i: "trading", x: 0, y: 10, w: 6, h: 14, minW: 2, minH: 3 },
      { i: "orderbook", x: 0, y: 14, w: 6, h: 14, minW: 2, minH: 3 },
      { i: "equity", x: 0, y: 18, w: 6, h: 3, minW: 2, minH: 2 },
      { i: "userfeed", x: 0, y: 21, w: 6, h: 6, minW: 4, minH: 3 },
    ],
    xs: [
      { i: "marketInfo", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 1 },
      { i: "chart", x: 0, y: 2, w: 4, h: 6, minW: 2, minH: 4 },
      { i: "trading", x: 0, y: 8, w: 4, h: 4, minW: 2, minH: 3 },
      { i: "orderbook", x: 0, y: 12, w: 4, h: 4, minW: 2, minH: 3 },
      { i: "equity", x: 0, y: 16, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "userfeed", x: 0, y: 19, w: 4, h: 4, minW: 2, minH: 3 },
    ],
  });

  const handleLayoutChange = (
    layout: Layout[],
    allLayouts: { [key: string]: Layout[] },
  ) => {
    setLayouts(allLayouts);
  };

  const handleBreakpointChange = (breakpoint: string) => {
    console.log("Current breakpoint:", breakpoint);
  };

  return (
    <WalletProvider>
      <MarketDataProvider>
        <div className="min-h-screen bg-background trading-gradient">
          <Header />

          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1420, md: 1000, sm: 0 }}
            cols={COLS}
            rowHeight={30}
            onLayoutChange={handleLayoutChange}
            onBreakpointChange={handleBreakpointChange}
            // TODO: implement draggabiliy
            isDraggable={false}
            isResizable={false}
            margin={[1, 1]}
            containerPadding={[0, 0]}
          >
            <div key="marketInfo" className="bg-card border rounded-lg">
              <MarketInfoHeader />
            </div>
            <div key="chart" className="bg-card border rounded-lg">
              <TradingChart />
            </div>
            <div key="orderbook" className="bg-card border rounded-lg">
              <OrderBook />
            </div>
            <div key="trading" className="bg-card border rounded-lg">
              <TradingInterface />
            </div>
            <div key="equity" className="bg-card border rounded-lg">
              <AccountEquity />
            </div>
            <div key="userfeed" className="bg-card border rounded-lg">
              <UserFeed />
            </div>
          </ResponsiveGridLayout>
        </div>
      </MarketDataProvider>
    </WalletProvider>
  );
}
