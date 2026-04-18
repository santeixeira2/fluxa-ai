import { useState } from 'react';
import { explainSimulation, type SimulationResult } from '../api/client';
import { useApi } from '../hooks/useApi';

interface ResultCardProps {
  result: SimulationResult | null;
  lastRequest: { investment: number; futurePrice: number } | null;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ResultCard({ result, lastRequest }: ResultCardProps) {
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
            Configure seu investimento e clique em simular para ver os resultados aqui.
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
            <div className="result-label">Resultado</div>
            <div className="result-asset-name">Simulação de Investimento</div>
          </div>
          <span className={`result-roi ${roiClass}`}>
            {isProfit ? '+' : ''}{result.roi.toFixed(2)}%
          </span>
        </div>

        {/* Big value */}
        <div className="result-big-value">
          <div className="result-big-value-label">Valor Final</div>
          <div className={`result-big-number ${valueClass}`}>
            {formatBRL(result.finalValue)}
          </div>
          <div className={`result-big-change`} style={{ color: isProfit ? 'var(--color-profit)' : 'var(--color-loss)' }}>
            <span>{isProfit ? '↑' : '↓'}</span>
            <span>{isProfit ? '+' : ''}{formatBRL(result.profit)}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="result-metrics">
          <div className="result-metric">
            <div className="result-metric-label">Preço Atual</div>
            <div className="result-metric-value">{formatBRL(result.currentPrice)}</div>
          </div>
          <div className="result-metric">
            <div className="result-metric-label">Preço Alvo</div>
            <div className="result-metric-value">{lastRequest ? formatBRL(lastRequest.futurePrice) : '—'}</div>
          </div>
          <div className="result-metric">
            <div className="result-metric-label">Investido</div>
            <div className="result-metric-value">{lastRequest ? formatBRL(lastRequest.investment) : '—'}</div>
          </div>
          <div className="result-metric">
            <div className="result-metric-label">Lucro / Prejuízo</div>
            <div className={`result-metric-value ${valueClass}`}>
              {isProfit ? '+' : ''}{formatBRL(result.profit)}
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
            <><span className="spinner small light" /> Gerando análise...</>
          ) : (
            <>✦ Analisar com Flux AI</>
          )}
        </button>

        {explainApi.error && (
          <div className="error-message" role="alert">{explainApi.error}</div>
        )}

        {explanation && (
          <div className="ai-explanation">
            <div className="ai-explanation-label">✦ Flux AI</div>
            <p className="ai-explanation-text">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
