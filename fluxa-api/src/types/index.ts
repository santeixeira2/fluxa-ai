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