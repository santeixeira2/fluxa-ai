import { getChartData } from "./price.service";
import { getCached, setCached } from "@/utils/cache";
import { stddev, trailingMean } from "@/utils/stats";
import { getAsset, ASSETS } from "@/config/assets.config";
import type { Regime, RegimeResult } from "@/types";

const REGIME_TTL_MS = 60_000;

interface Point {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const computeMetrics = (monthPoints: Point[], baselineVol: number) => {
  const closes = monthPoints.map(p => p.close);
  const n = closes.length;

  const returns: number[] = [];
  for (let i = 1; i < n; i++) {
    if (closes[i - 1] !== 0) {
      returns.push(closes[i] / closes[i - 1] - 1);
    }
  }

  const volWindow   = Math.max(7, Math.floor(returns.length / 2));
  const realizedVol = stddev(returns.slice(-volWindow));

  const smaWindow = Math.max(5, Math.floor(n / 3));
  const lookback  = Math.max(2, Math.floor(n / 6));
  const smaNow    = trailingMean(closes, smaWindow);
  const smaPrev   = trailingMean(closes.slice(0, n - lookback), smaWindow);
  const smaSlope  = smaPrev !== 0 ? (smaNow - smaPrev) / smaPrev : 0;

  const recentCandles = monthPoints.slice(-Math.max(7, Math.floor(n / 3)));
  const ups = recentCandles.filter(p => p.close >= p.open).length;
  const directionalBias = Math.abs(ups / recentCandles.length - 0.5) * 2;

  return {
    realizedVol: parseFloat(realizedVol.toFixed(4)),
    smaSlope: parseFloat(smaSlope.toFixed(4)),
    directionalBias: parseFloat(directionalBias.toFixed(4)),
    baselineVol,
  }
}

const classify = (metrics: ReturnType<typeof computeMetrics>): RegimeResult => {
  const { realizedVol, smaSlope, directionalBias, baselineVol } = metrics;

  const SLOPE_THRESHOLD = 0.02;
  const DIR_THRESHOLD = 0.3;
  const VOL_MULTIPLIER = 1.5;

  const slopeAbs= Math.abs(smaSlope);
  const isTrending = slopeAbs > SLOPE_THRESHOLD && directionalBias > DIR_THRESHOLD;
  const isVolatile = realizedVol > baselineVol * VOL_MULTIPLIER;

  let regime: Regime;
  let confidence: number;

  if (isTrending) { 
    regime = smaSlope > 0 ? 'trending_up' : 'trending_down';
    const slopeConfidence = Math.min(slopeAbs / (SLOPE_THRESHOLD * 2), 1);
    confidence = 0.5 + slopeConfidence * 0.3 + directionalBias * 0.2;
  } else if (isVolatile) {
    regime = 'volatile';
    confidence = Math.min(0.5 + (realizedVol / (baselineVol * VOL_MULTIPLIER) - 1) * 0.5, 0.95);
  } else {
    regime = 'mean_reverting';
    const flatness = Math.max(0, 1 - slopeAbs / SLOPE_THRESHOLD);
    const calmness = Math.max(0, 1 - realizedVol / (baselineVol * VOL_MULTIPLIER));
    confidence = 0.5 * flatness + 0.5 * calmness;
  }

  return {
    regime,
    confidence: parseFloat(Math.min(1, Math.max(0, confidence)).toFixed(2)),
    metrics: {
      realizedVol: metrics.realizedVol,
      smaSlope: metrics.smaSlope,
      directionalBias: metrics.directionalBias,
    }
  }
}

export const detectRegime = async (assetId: string): Promise<RegimeResult> => {
  const cacheKey = `regime:${assetId}`;
  const cached = getCached<RegimeResult>(cacheKey);
  if (cached) return cached;

  const asset = getAsset(assetId);
  if (!asset) throw new Error(`Unknown asset: ${assetId}`);
  if (asset.provider === 'exchangerate') throw new Error('Regime detection not available for forex pairs');

  const [yearPoints, monthPoints] = await Promise.all([
    getChartData(assetId, '1Y', 'brl'),
    getChartData(assetId, '1M', 'brl'),
  ]);

  if (monthPoints.length < 10) throw new Error('Not enough data for analysis');

  const yearCloses = (yearPoints as Point[]).map(p => p.close);
  const yearReturns: number[] = [];

  for (let i = 1; i < yearCloses.length; i++) {
    if (yearCloses[i - 1] !== 0) {
      yearReturns.push((yearCloses[i] - yearCloses[i - 1]) / yearCloses[i - 1]);
    }
  }
  const baselineVol = stddev(yearReturns);

  const metrics = computeMetrics(monthPoints as Point[], baselineVol);
  const result = classify(metrics);

  setCached(cacheKey, result, 15 * REGIME_TTL_MS);
  return result;
}

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
