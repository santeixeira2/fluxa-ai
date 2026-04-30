import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDisplayCurrency } from '../contexts/DisplayCurrencyContext';
import { explainSimulation, type SimulationResult } from '../api/client';
import { useApi } from '../hooks/useApi';

interface ResultCardProps {
  result: SimulationResult | null;
  lastRequest: { investment: number; futurePrice: number } | null;
}

export default function ResultCard({ result, lastRequest }: ResultCardProps) {
  const { t } = useTranslation();
  const { formatFromBrl } = useDisplayCurrency();
  const explainApi = useApi<{ explanation: string }>();
  const [explanation, setExplanation] = useState<string | null>(null);

  async function handleExplain() {
    if (!result || !lastRequest) return;
    const res = await explainApi.execute(() =>
      explainSimulation({
        currentPrice: result.currentPrice,
        finalValue: result.finalValue,
        profit: result.profit,
        roi: result.roi,
        investment: lastRequest.investment,
        futurePrice: lastRequest.futurePrice,
      })
    );
    if (res) setExplanation(res.explanation);
  }

  if (!result) {
    return (
      <div className="result-card glass-card" id="result-card">
        <div className="result-placeholder">
          <div className="result-placeholder-icon">◈</div>
          <p className="result-placeholder-text">
            {t('resultCard.placeholder')}
          </p>
        </div>
      </div>
    );
  }

  const isProfit = result.profit >= 0;
  const roiClass = isProfit ? 'positive' : 'negative';
  const valueClass = isProfit ? 'profit' : 'loss';

  return (
    <div className="result-card glass-card" id="result-card">
      <div className="result-content">
        {/* Header */}
        <div className="result-header">
          <div className="result-asset-info">
            <div className="result-label">{t('resultCard.resultLabel')}</div>
            <div className="result-asset-name">{t('resultCard.simulationTitle')}</div>
          </div>
          <span className={`result-roi ${roiClass}`}>
            {isProfit ? '+' : ''}{result.roi.toFixed(2)}%
          </span>
        </div>

        {/* Big value */}
        <div className="result-big-value">
          <div className="result-big-value-label">{t('resultCard.finalValue')}</div>
          <div className={`result-big-number ${valueClass}`}>
            {formatFromBrl(result.finalValue)}
          </div>
          <div className={`result-big-change`} style={{ color: isProfit ? 'var(--color-profit)' : 'var(--color-loss)' }}>
            <span>{isProfit ? '↑' : '↓'}</span>
            <span>{isProfit ? '+' : ''}{formatFromBrl(result.profit)}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="result-metrics">
          <div className="result-metric">
            <div className="result-metric-label">{t('resultCard.currentPrice')}</div>
            <div className="result-metric-value">{formatFromBrl(result.currentPrice)}</div>
          </div>
          <div className="result-metric">
            <div className="result-metric-label">{t('resultCard.targetPrice')}</div>
            <div className="result-metric-value">{lastRequest ? formatFromBrl(lastRequest.futurePrice) : t('common.dash')}</div>
          </div>
          <div className="result-metric">
            <div className="result-metric-label">{t('resultCard.invested')}</div>
            <div className="result-metric-value">{lastRequest ? formatFromBrl(lastRequest.investment) : t('common.dash')}</div>
          </div>
          <div className="result-metric">
            <div className="result-metric-label">{t('resultCard.profitLoss')}</div>
            <div className={`result-metric-value ${valueClass}`}>
              {isProfit ? '+' : ''}{formatFromBrl(result.profit)}
            </div>
          </div>
        </div>

        {/* Explain button */}
        <button
          className="btn-explain"
          onClick={handleExplain}
          disabled={explainApi.loading}
          id="btn-explain"
        >
          {explainApi.loading ? (
            <><span className="spinner small light" /> {t('resultCard.explainLoading')}</>
          ) : (
            <>{t('resultCard.explainButton')}</>
          )}
        </button>

        {explainApi.error && (
          <div className="error-message" role="alert">{explainApi.error}</div>
        )}

        {explanation && (
          <div className="ai-explanation">
            <div className="ai-explanation-label">{t('resultCard.fluxaAiLabel')}</div>
            <p className="ai-explanation-text">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
