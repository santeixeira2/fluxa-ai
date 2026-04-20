import { useState, useEffect, useMemo } from 'react';
import { simulate, type SimulationResult } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useAssets } from '../../hooks/useAssets';
import SimulatorForm, { type TabType } from '../forms/SimulatorForm';

export interface SimFormData {
  asset: string;
  investment: string;
  futurePrice: string;
}

interface SimulatorProps {
  prefill?: SimFormData | null;
  onPrefillConsumed?: () => void;
  onAssetChange?: (assetId: string) => void;
}

const TAB_TYPES: Record<TabType, string[]> = {
  crypto: ['crypto'],
  stocks: ['stock', 'br_stock', 'etf', 'commodity'],
  forex:  ['forex'],
};

export default function SimulatorContainer({ prefill, onPrefillConsumed, onAssetChange }: SimulatorProps) {
  const { assets } = useAssets();
  const [tab, setTab]           = useState<TabType>('crypto');
  const [asset, setAsset]       = useState('');
  const [investment, setInvestment]   = useState('');
  const [futurePrice, setFuturePrice] = useState('');

  const simApi = useApi<SimulationResult>();

  const grouped = useMemo(() => {
    const result: Record<TabType, { value: string; label: string }[]> = { crypto: [], stocks: [], forex: [] };
    for (const a of assets) {
      const t = (Object.entries(TAB_TYPES).find(([, types]) => types.includes(a.type))?.[0] ?? 'stocks') as TabType;
      result[t].push({ value: a.id, label: `${a.name} (${a.symbol})` });
    }
    return result;
  }, [assets]);

  // Set default asset when tab changes or assets load
  useEffect(() => {
    const list = grouped[tab];
    if (list.length > 0 && (!asset || !list.find(a => a.value === asset))) {
      const first = list[0].value;
      setAsset(first);
      onAssetChange?.(first);
    }
  }, [tab, grouped]);

  // Handle prefill from AI
  useEffect(() => {
    if (!prefill) return;
    if (prefill.asset) {
      for (const [t, list] of Object.entries(grouped)) {
        const match = list.find(a =>
          a.value.toLowerCase() === prefill.asset?.toLowerCase() ||
          a.label.toLowerCase().includes(prefill.asset?.toLowerCase() ?? '')
        );
        if (match) { setTab(t as TabType); setAsset(match.value); break; }
      }
    }
    if (prefill.investment) setInvestment(prefill.investment);
    if (prefill.futurePrice) setFuturePrice(prefill.futurePrice);
    const timer = setTimeout(() => onPrefillConsumed?.(), 50);
    return () => clearTimeout(timer);
  }, [prefill, onPrefillConsumed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const inv = parseFloat(investment);
    const fp  = parseFloat(futurePrice);
    if (!inv || !fp) return;
    await simApi.execute(() =>
      simulate({ asset, investment: inv, futurePrice: fp, currency: 'brl' })
    );
  }

  return (
    <SimulatorForm
      tab={tab}
      setTab={setTab}
      asset={asset}
      setAsset={v => { setAsset(v); onAssetChange?.(v); }}
      grouped={grouped}
      investment={investment}
      setInvestment={setInvestment}
      futurePrice={futurePrice}
      setFuturePrice={setFuturePrice}
      isLoading={simApi.loading}
      result={simApi.data}
      onSubmit={handleSubmit}
    />
  );
}
