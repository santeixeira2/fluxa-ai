export interface ParserUserInput {
  asset: string;
  investment: number;
  futurePrice?: number;
}

export interface SimulationResult {
  currentPrice: number;
  finalValue: number;
  profit: number;
  roi: number;
}

export interface HistoricalSimulationResult {
  purchaseDate: string;
  priceAtPurchase: number;
  currentPrice: number;
  quantity: number;
  currentValue: number;
  profit: number;
  roi: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  details?: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  name?: string;
}

export type Regime = 'trending_up' | 'trending_down' | 'volatile' | 'mean_reverting';

export interface RegimeResult {
  regime: Regime;
  confidence: number;
  metrics: {
    realizedVol: number;
    smaSlope: number;
    directionalBias: number;
  }
}

export type ComparisonPeriod = '1M' | '1Y' | '5Y';

export interface ComparisonAssetMetrics {
  totalReturn: number;
  annualizedVol: number;
  sharpe: number;
  maxDrawdown: number;
}

export interface ComparisonAsset {
  id: string;
  name: string;
  symbol: string;
  series: { time: number; normalized: number }[];
  metrics: ComparisonAssetMetrics;
}

export interface ComparisonResult {
  period: ComparisonPeriod;
  assets: [ComparisonAsset, ComparisonAsset];
  correlation: number;
}

export type DCAFrequency = 'weekly' | 'monthly';

export interface DCAScheduleItem {
  date: string;
  price: number;
  quantity: number;
  cumulative: number;
}

export interface DCAResult {
  schedule: DCAScheduleItem[];
  totalInvested: number;
  totalQuantity: number;
  averagePrice: number;
  currentPrice: number;
  currentValue: number;
  profit: number;
  roi: number;
  lumpSum: {
    quantity: number;
    currentValue: number;
    profit: number;
    roi: number;
  };
}
