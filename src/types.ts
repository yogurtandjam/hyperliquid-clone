export type MarketData = {
  [symbol: string]: {
    price: string;
    change24h: string;
    changePercent24h: string;
    volume24h: string;
  };
};

export type OrderBookData = {
  symbol: string;
  bids: Array<{ price: string; size: string; total: string }>;
  asks: Array<{ price: string; size: string; total: string }>;
  spread: { absolute: string; percentage: string };
};

export type Trade = {
  coin: string;
  price: string;
  size: string;
  side: "buy" | "sell";
  time: number;
  txHash?: string;
};

export type Asset = {
  name: string;
  szDecimals: number;
};

export type BalanceData = {
  accountValue: string;
  availableBalance: string;
  marginUsed: string;
  withdrawable: string;
  crossMaintenanceMarginUsed?: string;
  totalNtlPos?: string;
  totalRawUsd?: string;
  unrealizedPnl?: number;
};

export type Position = {
  coin: string;
  szi: string;
  entryPx?: string;
  unrealizedPnl?: string;
  liquidationPrice?: string;
  leverage?: string;
  marginUsed?: string;
  positionValue?: string;
  returnOnEquity?: string;
};

export type OpenOrder = {
  coin: string;
  side: "buy" | "sell";
  orderType: string;
  sz: string;
  px: string;
  filled?: string;
  timestamp: number;
  oid: number;
  origSz?: string;
  reduceOnly?: boolean;
};

export type OrderHistoryItem = {
  coin: string;
  side: "buy" | "sell";
  px: string;
  sz: string;
  time: number;
  fee: string;
  closedPnl?: string;
};

export type FundingHistoryItem = {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
};

export type TwapData = {
  twap: string;
  volume: string;
  trades: number;
  period: string;
};

export type AppDataContextType = {
  // Market data (WebSocket)
  marketData: MarketData;
  orderBook: OrderBookData | null;
  recentTrades: Trade[];
  selectedSymbol: string;
  selectedAsset: Asset | null;
  setSelectedSymbol: (symbol: string) => void;
  isConnected: boolean;
  refreshData: () => void;
  availableAssets: Asset[];
  
  // User data (WebSocket)
  balanceData: BalanceData | null;
  positions: Position[];
  openOrders: OpenOrder[];
  
  // Historical data (HTTP/useQuery)
  tradeHistory: Trade[];
  orderHistory: OrderHistoryItem[];
  fundingHistory: FundingHistoryItem[];
  twapData: TwapData | null;
  
  // State update methods for historical data
  setTradeHistory: (trades: Trade[]) => void;
  setOrderHistory: (orders: OrderHistoryItem[]) => void;
  setFundingHistory: (funding: FundingHistoryItem[]) => void;
  setTwapData: (twap: TwapData | null) => void;
};

// Keep for backward compatibility during transition
export type MarketDataContextType = AppDataContextType;

export type MarketDataSetter = React.Dispatch<React.SetStateAction<MarketData>>;

export type BalanceDataSetter = React.Dispatch<
  React.SetStateAction<BalanceData | null>
>;

export type PositionsSetter = React.Dispatch<React.SetStateAction<Position[]>>;

export type OpenOrdersSetter = React.Dispatch<
  React.SetStateAction<OpenOrder[]>
>;

export enum QueryKeys {
  Trades = "Trades",
}
