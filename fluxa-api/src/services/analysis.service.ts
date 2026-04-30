import { getCached, setCached } from "@/utils/cache";
import { getAsset, ASSETS } from "@/config/assets.config";
import { prisma } from "@/utils/prisma";
import type { Regime, RegimeResult, SentimentResult, EarningsGuidance, EarningsTone, RiskResult } from "@/types";
import { getPortfolio } from "./portfolio.service";

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

export const getSentiment = async (assetId: string): Promise<SentimentResult> => {
  const asset = getAsset(assetId);
  if (!asset) throw new Error(`Unknown asset: ${assetId}`);

  const ticker = (asset.yahooTicker ?? asset.id).toUpperCase();

  // DB is the source of truth — return stored quarters if available
  const rows = await prisma.earningsSentiment.findMany({
    where: { ticker },
    orderBy: { filingDate: 'desc' },
    take: 4,
  });

  if (rows.length > 0) {
    return {
      ticker,
      available: true,
      quarters: rows.map(r => ({
        period: r.period,
        date: r.filingDate.toISOString().slice(0, 10),
        sentiment: r.sentiment,
        guidance: r.guidance as EarningsGuidance,
        tone: r.tone as EarningsTone,
        beats_estimates: r.beatsEstimates,
        summary: r.summary,
      })),
      error: null,
    };
  }

  // Not in DB yet — fetch from ML service and persist
  const res = await fetch(`${ML_URL}/sentiment?asset=${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ML service error for ${ticker}: ${body}`);
  }

  const result = await res.json() as SentimentResult;

  if (result.available && result.quarters.length > 0) {
    await prisma.earningsSentiment.createMany({
      data: result.quarters.map(q => ({
        ticker,
        period: q.period,
        filingDate: new Date(q.date),
        sentiment: q.sentiment,
        guidance: q.guidance,
        tone: q.tone,
        beatsEstimates: q.beats_estimates,
        summary: q.summary,
      })),
      skipDuplicates: true,
    });
  }

  return result;
};

// Used by the scheduled refresh job — fetches from ML and upserts any new quarters
export const refreshSentiment = async (assetId: string): Promise<{ ticker: string; newQuarters: number }> => {
  const asset = getAsset(assetId);
  if (!asset) throw new Error(`Unknown asset: ${assetId}`);

  const ticker = (asset.yahooTicker ?? asset.id).toUpperCase();

  const res = await fetch(`${ML_URL}/sentiment?asset=${encodeURIComponent(ticker)}`);
  if (!res.ok) return { ticker, newQuarters: 0 };

  const result = await res.json() as SentimentResult;
  if (!result.available || result.quarters.length === 0) return { ticker, newQuarters: 0 };

  const existing = await prisma.earningsSentiment.findMany({
    where: { ticker },
    select: { period: true },
  });
  const existingPeriods = new Set(existing.map(r => r.period));

  const newQuarterData = result.quarters.filter(q => !existingPeriods.has(q.period));

  if (newQuarterData.length > 0) {
    await prisma.earningsSentiment.createMany({
      data: newQuarterData.map(q => ({
        ticker,
        period: q.period,
        filingDate: new Date(q.date),
        sentiment: q.sentiment,
        guidance: q.guidance,
        tone: q.tone,
        beatsEstimates: q.beats_estimates,
        summary: q.summary,
      })),
      skipDuplicates: true,
    });
  }

  return { ticker, newQuarters: newQuarterData.length };
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

export const getRiskAnalysis = async (userId: string): Promise<RiskResult> => {
  const portfolio = await getPortfolio(userId);

  if (portfolio.positions.length === 0) {
    throw new Error('No positions in portfolio');
  }

  const investedValue = portfolio.positions.reduce((s, p) => s + p.currentValue, 0);
  
  if (investedValue === 0) throw new Error('Portfolio has no invested value');

  const tickers = portfolio.positions.map(p => {
    const asset = getAsset(p.assetId);
    return asset?.yahooTicker ?? p.assetId.toUpperCase();
  });

  const weights = portfolio.positions.map(p => p.currentValue / investedValue);

  const res = await fetch(`${ML_URL}/risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickers, weights }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ML risk service error: ${body}`);
  }

  return await res.json() as Promise<RiskResult>;
  
}