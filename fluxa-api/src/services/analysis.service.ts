import { getCached, setCached } from "@/utils/cache";
import { getAsset, ASSETS } from "@/config/assets.config";
import type { Regime, RegimeResult, SentimentResult } from "@/types";

const ML_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
const REGIME_TTL_MS = 15 * 60_000;

const toMlTicker = (assetId: string): string => {
  const asset = getAsset(assetId);
  if (!asset) throw new Error(`Unknown asset: ${assetId}`);
  if (asset.provider === 'exchangerate') throw new Error('Regime detection not available for forex pairs');
  if (asset.provider === 'cryptocompare') return `${asset.ccSymbol}-USD`;
  return asset.yahooTicker!;
};

export const detectRegime = async (assetId: string): Promise<RegimeResult> => {
  const cacheKey = `regime:${assetId}`;
  const cached = getCached<RegimeResult>(cacheKey);
  if (cached) return cached;

  const ticker = toMlTicker(assetId);
  const res = await fetch(`${ML_URL}/regime?asset=${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ML service error for ${ticker}: ${body}`);
  }

  const data = await res.json() as { regime: Regime; confidence: number };
  const result: RegimeResult = { regime: data.regime, confidence: data.confidence };

  setCached(cacheKey, result, REGIME_TTL_MS);
  return result;
}

const SENTIMENT_TTL_MS = 24 * 60 * 60_000; // earnings are quarterly — cache 24h

export const getSentiment = async (assetId: string): Promise<SentimentResult> => {
  const cacheKey = `sentiment:${assetId}`;
  const cached = getCached<SentimentResult>(cacheKey);
  if (cached) return cached;

  const asset = getAsset(assetId);
  if (!asset) throw new Error(`Unknown asset: ${assetId}`);

  // Only Yahoo-provider US stocks have EDGAR filings; others return not_supported
  const ticker = asset.yahooTicker ?? asset.id;

  const res = await fetch(`${ML_URL}/sentiment?asset=${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ML service error for ${ticker}: ${body}`);
  }

  const result = await res.json() as SentimentResult;
  if (result.available) {
    setCached(cacheKey, result, SENTIMENT_TTL_MS);
  }
  return result;
};

export const detectAssetFromMessage = (message: string): string | null => {
  const lower = message.toLowerCase();
  for (const asset of ASSETS) {
    if (
      lower.includes(asset.id) ||
      lower.includes(asset.name.toLowerCase()) ||
      lower.includes(asset.symbol.toLowerCase())
    ) {
      return asset.id;
    }
  }
  return null;
}

export const formatRegimeForPrompt = (assetId: string, result: RegimeResult): string => {
  const asset = getAsset(assetId);
  const name = asset ? `${asset.name} (${asset.symbol})` : assetId;

  const labels: Record<Regime, string> = {
    trending_down: 'tendência de baixa',
    trending_up: 'tendência de alta',
    volatile: 'alta volatilidade sem direção clara',
    mean_reverting: 'consolidação ou reversão à média',
  }
  
  return `REGIME ATUAL DE ${name.toUpperCase()}: ${labels[result.regime]} (confiança: ${Math.round(result.confidence * 100)}%)`;
}
