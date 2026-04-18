const BASE = import.meta.env.VITE_API_URL;

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}


async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }

  return res.json();
}

export interface PriceResponse {
  asset: string;
  currency: string;
  price: number;
}

export function getPrice(asset: string, currency = 'brl'): Promise<PriceResponse> {
  return request(`/price/price?asset=${encodeURIComponent(asset)}&currency=${encodeURIComponent(currency)}`);
}

export interface BatchPriceResponse {
  currency: string;
  prices: Record<string, number>;
}

export function getPriceBatch(assets: string[], currency = 'brl'): Promise<BatchPriceResponse> {
  return request(`/price/batch?assets=${encodeURIComponent(assets.join(','))}&currency=${encodeURIComponent(currency)}`);
}

export interface SimulationRequest {
  asset?: string;
  investment: number;
  currentPrice?: number;
  futurePrice: number;
  currency?: string;
}

export interface SimulationResult {
  currentPrice: number;
  finalValue: number;
  profit: number;
  roi: number;
}

export function simulate(data: SimulationRequest): Promise<SimulationResult> {
  return request('/simulate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ParsedInput {
  asset: string;
  investment: number;
  futurePrice: number | null;
}

export function parseUserInput(message: string): Promise<ParsedInput> {
  return request('/ai/parse', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export interface ExplainRequest {
  currentPrice: number;
  finalValue: number;
  profit: number;
  roi: number;
  investment: number;
  futurePrice: number;
}

export function explainSimulation(data: ExplainRequest): Promise<{ explanation: string }> {
  return request('/ai/explain', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function chatAiStream(
  message: string,
  onToken: (token: string) => void,
): Promise<void> {
  const res = await fetch(`${BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      try {
        const { token } = JSON.parse(payload);
        if (token) onToken(token);
      } catch { /* incomplete line */ }
    }
  }
}

export interface HistoricalSimulationRequest {
  asset: string;
  purchaseDate: string; // YYYY-MM-DD
  investment: number;
  currency?: string;
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

export function simulateHistorical(data: HistoricalSimulationRequest): Promise<HistoricalSimulationResult> {
  return request('/simulate/historical', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface FiatRateResponse {
  rate: number;
}

export function getFiatRate(from: string, to: string): Promise<FiatRateResponse> {
  return request(`/price/fiat-rate?from=${from}&to=${to}`);
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export function authRegister(email: string, password: string, name: string, phone: string): Promise<AuthTokens> {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name, phone }) });
}

export function authGoogle(accessToken: string): Promise<AuthTokens> {
  return request('/auth/google', { method: 'POST', body: JSON.stringify({ idToken: accessToken }) });
}

export function authLogin(email: string, password: string): Promise<AuthTokens> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function authRefresh(refreshToken: string): Promise<AuthTokens> {
  return request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
}

export function authLogout(): Promise<void> {
  return request('/auth/logout', { method: 'POST' });
}

export type AssetType = 'crypto' | 'stock' | 'etf' | 'index' | 'commodity' | 'forex' | 'br_stock';

export interface AssetInfo {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  nativeCurrency: string;
  minDate: string;
}

export function getAssets(): Promise<AssetInfo[]> {
  return request('/assets');
}
