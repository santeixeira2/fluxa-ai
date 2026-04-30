import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSentiment, type SentimentResult, type SentimentQuarter } from '../api/client';

const GUIDANCE_STYLE: Record<string, string> = {
  raised: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  lowered: 'text-red-400 bg-red-400/10 border-red-400/20',
  maintained: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  none: '',
};

function sentimentColor(score: number): string {
  if (score >= 0.2) return 'bg-emerald-400';
  if (score <= -0.2) return 'bg-red-400';
  return 'bg-white/30';
}

function sentimentBg(score: number): string {
  if (score >= 0.2) return 'border-emerald-400/20 bg-emerald-400/[0.03]';
  if (score <= -0.2) return 'border-red-400/20 bg-red-400/[0.03]';
  return 'border-white/[0.06] bg-white/[0.02]';
}

function QuarterCard({ q }: { q: SentimentQuarter }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const barPct = Math.round(((q.sentiment + 1) / 2) * 100);
  const guidanceStyle = GUIDANCE_STYLE[q.guidance] ?? '';
  const guidanceLabel =
    q.guidance === 'raised'
      ? t('earningsSentiment.guidanceRaised')
      : q.guidance === 'lowered'
        ? t('earningsSentiment.guidanceLowered')
        : q.guidance === 'maintained'
          ? t('earningsSentiment.guidanceMaintained')
          : '';

  const toneLabel = t(`earningsSentiment.tone.${q.tone}`, { defaultValue: q.tone });
  const toneCls =
    q.tone === 'confident' ? 'text-emerald-300/60' : q.tone === 'cautious' ? 'text-yellow-300/60' : 'text-white/40';

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-colors ${sentimentBg(q.sentiment)}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-white/60 uppercase">{q.period}</span>
          <span className="text-[10px] text-white/30 ml-2">{q.date}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {q.beats_estimates !== null && (
            <span
              className={`text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded border ${
                q.beats_estimates
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                  : 'text-red-400 bg-red-400/10 border-red-400/20'
              }`}
            >
              {q.beats_estimates ? t('earningsSentiment.beat') : t('earningsSentiment.miss')}
            </span>
          )}
          {guidanceLabel && (
            <span className={`text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded border ${guidanceStyle}`}>
              {guidanceLabel}
            </span>
          )}
        </div>
      </div>

      <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-500 ${sentimentColor(q.sentiment)}`} style={{ width: `${barPct}%` }} />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono ${toneCls}`}>{toneLabel}</span>
        <span className="text-[10px] text-white/30">
          {q.sentiment >= 0 ? '+' : ''}
          {q.sentiment.toFixed(2)}
        </span>
      </div>

      {expanded && q.summary && (
        <p className="mt-3 text-[11px] leading-relaxed text-white/50 border-t border-white/[0.05] pt-3">{q.summary}</p>
      )}
    </div>
  );
}

interface Props {
  assetId: string;
}

export default function EarningsSentiment({ assetId }: Props) {
  const { t } = useTranslation();
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setResult(null);
    getSentiment(assetId)
      .then(r => {
        if (!cancelled) {
          setResult(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[88px] rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!result || !result.available) {
    return (
      <div className="flex items-center justify-center h-24 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <span className="text-[11px] font-mono tracking-widest text-white/30 uppercase">{t('earningsSentiment.noData')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono tracking-widest text-white/30 uppercase">{t('earningsSentiment.header')}</span>
        <span className="text-[10px] text-white/20">{result.ticker}</span>
      </div>
      {result.quarters.map(q => (
        <QuarterCard key={`${q.period}-${q.date}`} q={q} />
      ))}
      <p className="text-[9px] text-white/20 text-right mt-1">{t('earningsSentiment.footer')}</p>
    </div>
  );
}
