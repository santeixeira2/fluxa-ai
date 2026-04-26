const BASE = import.meta.env.VITE_API_URL;

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const { accessToken, refreshToken: newRefresh } = await res.json();
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefresh);
      // sync Redux store
      const { store } = await import('../store');
      const { setTokens } = await import('../store');
      store.dispatch(setTokens({ accessToken, refreshToken: newRefresh }));
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...options,
  });

  if (res.status === 401 && !path.includes('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retry = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        ...options,
      });
      if (retry.ok) return retry.json();
    }
    // refresh falhou — limpa sessão
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    const { store } = await import('../store');
    const { clearAuth } = await import('../store');
    store.dispatch(clearAuth());
    throw new Error('Sessão expirada. Faça login novamente.');
  }

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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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

// ── DCA ────────────────────────────────────────────────────────────────────

export type DCAFrequency = 'weekly' | 'monthly';

export interface DCARequest {
  asset: string;
  amount: number;
  frequency: DCAFrequency;
  startDate: string;
  endDate?: string;
  currency?: string;
}

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

export function simulateDCA(data: DCARequest): Promise<DCAResult> {
  return request('/simulate/dca', {
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

// ── Portfolio ──────────────────────────────────────────────────────────────

export interface Position {
  assetId: string;
  assetName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
}

export interface Portfolio {
  id: string;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  positions: Position[];
}

export interface PortfolioTransaction {
  id: string;
  assetId: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  executedAt: string;
}

export type TradeResult = { assetId: string; quantity: number; price: number; total: number };

export function getPortfolio(): Promise<Portfolio> {
  return request('/portfolio');
}

export function buyAsset(assetId: string, amount: number): Promise<TradeResult> {
  return request('/portfolio/buy', { method: 'POST', body: JSON.stringify({ assetId, amount }) });
}

export function sellAsset(assetId: string, quantity: number): Promise<TradeResult> {
  return request('/portfolio/sell', { method: 'POST', body: JSON.stringify({ assetId, quantity }) });
}

export function getPortfolioTransactions(): Promise<PortfolioTransaction[]> {
  return request('/portfolio/transactions');
}

export type ChartPeriod = '1D' | '1W' | '1M' | '1Y' | '5Y';

export interface OHLCVPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PerformancePoint {
  totalValue: string;
  timestamp: string;
}

export function getChartData(assetId: string, period: ChartPeriod, currency = 'brl'): Promise<OHLCVPoint[]> {
  return request(`/price/chart/${assetId}?period=${period}&currency=${currency}`);
}

export function getPortfolioPerformance(): Promise<PerformancePoint[]> {
  return request('/portfolio/performance');
}

export interface MonthlyReport {
  period: { year: number; month: number; label: string };
  startValue: number;
  endValue: number;
  periodPnl: number;
  periodPnlPct: number;
  peakValue: number;
  troughValue: number;
  maxDrawdownPct: number;
  trades: {
    total: number;
    buys: number;
    sells: number;
    volume: number;
    topAsset: { id: string; name: string; volume: number } | null;
  };
  alertsTriggered: number;
  topWinners: { assetId: string; assetName: string; pnl: number; pnlPct: number }[];
  topLosers: { assetId: string; assetName: string; pnl: number; pnlPct: number }[];
  aiSummary: string;
  generatedAt: string;
}

export function getMonthlyReport(year?: number, month?: number): Promise<MonthlyReport> {
  const params = new URLSearchParams();
  if (year != null) params.set('year', String(year));
  if (month != null) params.set('month', String(month));
  const qs = params.toString();
  return request(`/portfolio/report${qs ? `?${qs}` : ''}`);
}

// ── Profile ────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
  hasPassword: boolean;
}

export function getProfile(): Promise<UserProfile> {
  return request('/profile');
}

export function updateProfile(data: { name?: string; phone?: string }): Promise<UserProfile> {
  return request('/profile', { method: 'PATCH', body: JSON.stringify(data) });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return request('/profile/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) });
}

// ── Analysis ───────────────────────────────────────────────────────────────

export type Regime = 'trending_up' | 'trending_down' | 'volatile' | 'mean_reverting';

export interface RegimeResult {
  regime: Regime;
  confidence: number;
  metrics: {
    realizedVol: number;
    smaSlope: number;
    directionalBias: number;
  };
}

export function getRegime(assetId: string): Promise<RegimeResult> {
  return request(`/analysis/regime?asset=${encodeURIComponent(assetId)}`);
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

export function getComparison(
  idA: string,
  idB: string,
  period: ComparisonPeriod,
): Promise<ComparisonResult> {
  const assets = `${idA},${idB}`;
  return request(`/analysis/compare?assets=${encodeURIComponent(assets)}&period=${period}`);
}

// ── Markets ────────────────────────────────────────────────────────────────

export interface MarketItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export type MarketCategory = 'indices' | 'crypto' | 'stocks' | 'br_stocks' | 'commodities' | 'currencies';

export type MarketsData = Record<MarketCategory, MarketItem[]>;

export function getMarkets(): Promise<MarketsData> {
  return request('/markets');
}

// ── Alerts ─────────────────────────────────────────────────────────────────

export type AlertType = 'PRICE_ABOVE' | 'PRICE_BELOW';

export interface Alert {
  id: string;
  asset_id: string;
  type: AlertType;
  threshold: string;
  active: boolean;
  triggered_at: string | null;
  created_at: string;
  alert_triggers: { price_brl: string; message: string | null; triggered_at: string }[];
}

export function listAlerts(): Promise<Alert[]> {
  return request('/alerts');
}

export function createAlert(assetId: string, type: AlertType, threshold: number): Promise<Alert> {
  return request('/alerts', { method: 'POST', body: JSON.stringify({ assetId, type, threshold }) });
}

export function deleteAlert(id: string): Promise<void> {
  return request(`/alerts/${id}`, { method: 'DELETE' });
}

// ── Notifications ──────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  message: string | null;
  price_brl: string;
  triggered_at: string;
  alerts: {
    asset_id: string;
    type: string;
    threshold: string;
  } | null;
}

export function getNotifications(): Promise<Notification[]> {
  return request('/notifications');
}

export function markNotificationsRead(): Promise<void> {
  return request('/notifications/read', { method: 'POST' });
}
