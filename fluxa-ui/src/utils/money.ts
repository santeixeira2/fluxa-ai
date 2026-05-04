export type DisplayCurrency = 'BRL' | 'USD';

const STORAGE_KEY = 'fluxa-currency';

export function readStoredCurrency(): DisplayCurrency {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s === 'USD' ? 'USD' : 'BRL';
  } catch {
    return 'BRL';
  }
}

export function writeStoredCurrency(c: DisplayCurrency): void {
  try {
    localStorage.setItem(STORAGE_KEY, c);
  } catch { /* ignore */ }
}

/** `brlPerUsd` = quantos BRL por 1 USD (ex.: 5.5). Valores da API em BRL → USD = valorBRL / brlPerUsd */
export function formatFromBrl(
  amountBrl: number,
  currency: DisplayCurrency,
  brlPerUsd: number | null,
  locale: string,
): string {
  const loc = locale.startsWith('en') ? 'en-US' : 'pt-BR';
  if (currency === 'BRL' || brlPerUsd == null || brlPerUsd <= 0) {
    return amountBrl.toLocaleString(loc, { style: 'currency', currency: 'BRL' });
  }
  const usd = amountBrl / brlPerUsd;
  return usd.toLocaleString(loc, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
