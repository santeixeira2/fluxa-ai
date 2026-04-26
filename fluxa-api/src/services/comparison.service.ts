import { getChartData } from "./price.service";
import { getCached, setCached } from "@/utils/cache";
import { mean, stddev, correlation } from "@/utils/stats";
import { getAsset, type AssetConfig } from "@/config/assets.config";
import type {
  ComparisonAsset,
  ComparisonAssetMetrics,
  ComparisonPeriod,
  ComparisonResult,
} from "@/types";

const COMPARISON_TTL_MS = 5 * 60 * 1000;
const MIN_OVERLAP_POINTS = 10;

interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const annualizationFactor = (asset: AssetConfig): number => {
  // Crypto and forex trade ~365 days. Stocks/ETFs/commodities use 252 trading days.
  return asset.provider === 'cryptocompare' || asset.provider === 'exchangerate' ? 365 : 252;
};

const intersectByTime = (a: OHLCV[], b: OHLCV[]): { a: OHLCV[]; b: OHLCV[] } => {
  const mapB = new Map(b.map(p => [p.time, p]));
  const outA: OHLCV[] = [];
  const outB: OHLCV[] = [];
  for (const pa of a) {
    const pb = mapB.get(pa.time);
    if (pb) { outA.push(pa); outB.push(pb); }
  }
  return { a: outA, b: outB };
};

const logReturns = (closes: number[]): number[] => {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) {
      r.push(Math.log(closes[i] / closes[i - 1]));
    }
  }
  return r;
};

const maxDrawdown = (closes: number[]): number => {
  if (closes.length === 0) return 0;
  let peak = closes[0];
  let mdd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    if (peak > 0) {
      const dd = (c - peak) / peak;
      if (dd < mdd) mdd = dd;
    }
  }
  return mdd;
};

const computeAsset = (
  asset: AssetConfig,
  points: OHLCV[],
  returns: number[],
): ComparisonAsset => {
  const closes = points.map(p => p.close);
  const p0 = closes[0];
  const pf = closes[closes.length - 1];

  const N = annualizationFactor(asset);
  const meanR = mean(returns);
  const sigmaD = stddev(returns);

  const totalReturn = ((pf / p0) - 1) * 100;
  const annualizedVol = sigmaD * Math.sqrt(N) * 100;
  const sharpe = sigmaD > 0 ? (meanR * Math.sqrt(N)) / sigmaD : 0;
  const mdd = maxDrawdown(closes) * 100;

  const metrics: ComparisonAssetMetrics = {
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    annualizedVol: parseFloat(annualizedVol.toFixed(2)),
    sharpe: parseFloat(sharpe.toFixed(2)),
    maxDrawdown: parseFloat(mdd.toFixed(2)),
  };

  const series = points.map(p => ({
    time: p.time,
    normalized: parseFloat(((p.close / p0) * 100).toFixed(4)),
  }));

  return {
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    series,
    metrics,
  };
};

export const compareAssets = async (
  idA: string,
  idB: string,
  period: ComparisonPeriod,
): Promise<ComparisonResult> => {
  if (idA === idB) throw new Error('Assets must be different');

  const assetA = getAsset(idA);
  const assetB = getAsset(idB);
  if (!assetA) throw new Error(`Unknown asset: ${idA}`);
  if (!assetB) throw new Error(`Unknown asset: ${idB}`);

  const cacheKey = `compare:${[idA, idB].sort().join(',')}:${period}`;
  const cached = getCached<ComparisonResult>(cacheKey);
  if (cached) {
    // Cache key is order-insensitive, but the response order must follow request.
    if (cached.assets[0].id === idA) return cached;
    return { ...cached, assets: [cached.assets[1], cached.assets[0]] };
  }

  const [rawA, rawB] = await Promise.all([
    getChartData(idA, period, 'brl'),
    getChartData(idB, period, 'brl'),
  ]) as [OHLCV[], OHLCV[]];

  const { a: alignedA, b: alignedB } = intersectByTime(rawA, rawB);
  if (alignedA.length < MIN_OVERLAP_POINTS) {
    throw new Error('Not enough overlapping data between the two assets for this period');
  }

  const returnsA = logReturns(alignedA.map(p => p.close));
  const returnsB = logReturns(alignedB.map(p => p.close));

  const assetResultA = computeAsset(assetA, alignedA, returnsA);
  const assetResultB = computeAsset(assetB, alignedB, returnsB);

  const corr = parseFloat(correlation(returnsA, returnsB).toFixed(2));

  const result: ComparisonResult = {
    period,
    assets: [assetResultA, assetResultB],
    correlation: corr,
  };

  setCached(cacheKey, result, COMPARISON_TTL_MS);
  return result;
};
