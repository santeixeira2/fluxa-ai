import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import i18n from '../i18n';
import { getFiatRate } from '../api/client';
import {
  type DisplayCurrency,
  formatFromBrl as formatFromBrlUtil,
  readStoredCurrency,
  writeStoredCurrency,
} from '../utils/money';

interface DisplayCurrencyContextValue {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  /** Taxa BRL por 1 USD; null se ainda não carregou */
  brlPerUsd: number | null;
  formatFromBrl: (amountBrl: number) => string;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(() =>
    typeof window !== 'undefined' ? readStoredCurrency() : 'BRL',
  );
  const [brlPerUsd, setBrlPerUsd] = useState<number | null>(null);
  const [langTick, setLangTick] = useState(0);

  const setCurrency = useCallback((c: DisplayCurrency) => {
    setCurrencyState(c);
    writeStoredCurrency(c);
  }, []);

  useEffect(() => {
    const onLang = () => setLangTick(n => n + 1);
    i18n.on('languageChanged', onLang);
    return () => {
      i18n.off('languageChanged', onLang);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getFiatRate('USD', 'BRL')
        .then(r => {
          if (!cancelled && r.rate > 0) setBrlPerUsd(r.rate);
        })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const formatFromBrl = useCallback(
    (amountBrl: number) =>
      formatFromBrlUtil(amountBrl, currency, brlPerUsd, i18n.language ?? 'pt-BR'),
    [currency, brlPerUsd, langTick],
  );

  const value = useMemo(
    () => ({ currency, setCurrency, brlPerUsd, formatFromBrl }),
    [currency, setCurrency, brlPerUsd, formatFromBrl],
  );

  return <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>;
}

export function useDisplayCurrency() {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) throw new Error('useDisplayCurrency must be used inside DisplayCurrencyProvider');
  return ctx;
}
