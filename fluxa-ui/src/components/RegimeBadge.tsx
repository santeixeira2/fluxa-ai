import { useEffect, useState } from 'react';
import { getRegime, type Regime, type RegimeResult } from '../api/client';

const CONFIG: Record<Regime, { label: string; icon: string }> = {
  trending_up:    { label: 'Tendência de Alta',  icon: '↑' },
  trending_down:  { label: 'Tendência de Baixa', icon: '↓' },
  volatile:       { label: 'Alta Volatilidade',  icon: '⌇' },
  mean_reverting: { label: 'Consolidação',        icon: '⇌' },
};

interface Props {
  assetId: string;
}

export default function RegimeBadge({ assetId }: Props) {
  const [result, setResult] = useState<RegimeResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRegime(assetId)
      .then(r => { if (!cancelled) setResult(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [assetId]);

  if (!result) return null;

  const { label, icon } = CONFIG[result.regime];

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] w-fit">
        <span className="text-[11px] text-white/50">{icon}</span>
        <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">{label}</span>
      </div>
      <div className="h-[2px] w-full rounded-full bg-white/[0.05] overflow-hidden ml-0.5">
        <div
          className="h-full rounded-full bg-white/40 transition-all duration-700"
          style={{ width: `${result.confidence * 100}%` }}
        />
      </div>
    </div>
  );
}
