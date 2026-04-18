import { useEffect, useState } from 'react';
import { getAssets, type AssetInfo } from '../api/client';

export function useAssets() {
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssets()
      .then(setAssets)
      .catch(() => {}) // silently fail — callers handle empty state
      .finally(() => setLoading(false));
  }, []);

  const byType = (type: AssetInfo['type']) => assets.filter(a => a.type === type);

  return { assets, loading, byType };
}
