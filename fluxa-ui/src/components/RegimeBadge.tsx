import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getRegime, type Regime, type RegimeResult } from '../api/client';
import InfoTooltip from './InfoTooltip';

const ICON: Record<Regime, string> = {
  trending_up:    '↑',
  trending_down:  '↓',
  volatile:       '⌇',
  mean_reverting: '⇌',
};

interface Props {
  assetId: string;
}

export default function RegimeBadge({ assetId }: Props) {
  const { t } = useTranslation();
  const [result, setResult] = useState<RegimeResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRegime(assetId)
      .then(r => { if (!cancelled) setResult(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [assetId]);

  if (!result) return null;

  const icon = ICON[result.regime];
  const label = t(`analysis.regime.regimes.${result.regime}`);
  const tooltip = t(`analysis.regime.tooltip.${result.regime}`);
  const explain = t(`analysis.regime.explain.${result.regime}`);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07]">
          <span className="text-[11px] text-white/50">{icon}</span>
          <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">{label}</span>
        </div>
        <InfoTooltip text={tooltip} />
      </div>

      <div className="h-[2px] w-full rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className="h-full rounded-full bg-white/40 transition-all duration-700"
          style={{ width: `${result.confidence * 100}%` }}
        />
      </div>

      <p className="text-[11px] text-white/35 leading-relaxed">{explain}</p>
    </div>
  );
}
