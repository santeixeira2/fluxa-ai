export type AssetType = 'crypto' | 'stock' | 'etf' | 'index' | 'commodity' | 'forex' | 'br_stock';
export type AssetProvider = 'cryptocompare' | 'yahoo' | 'exchangerate';

export interface AssetConfig {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  provider: AssetProvider;
  nativeCurrency: string;   // currency the provider returns
  minDate: string;          // YYYY-MM-DD earliest reliable data
  yahooTicker?: string;     // for yahoo provider
  ccSymbol?: string;        // for cryptocompare provider
}

export const ASSETS: AssetConfig[] = [

  // ── Crypto ────────────────────────────────────────────────────────────────
  { id: 'bitcoin',      symbol: 'BTC',   name: 'Bitcoin',         type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2013-04-28', ccSymbol: 'BTC'  },
  { id: 'ethereum',     symbol: 'ETH',   name: 'Ethereum',        type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2015-08-07', ccSymbol: 'ETH'  },
  { id: 'solana',       symbol: 'SOL',   name: 'Solana',          type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2020-04-10', ccSymbol: 'SOL'  },
  { id: 'binancecoin',  symbol: 'BNB',   name: 'BNB',             type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2017-07-25', ccSymbol: 'BNB'  },
  { id: 'ripple',       symbol: 'XRP',   name: 'XRP',             type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2013-08-04', ccSymbol: 'XRP'  },
  { id: 'cardano',      symbol: 'ADA',   name: 'Cardano',         type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2017-10-02', ccSymbol: 'ADA'  },
  { id: 'avalanche',    symbol: 'AVAX',  name: 'Avalanche',       type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2020-09-23', ccSymbol: 'AVAX' },
  { id: 'dogecoin',     symbol: 'DOGE',  name: 'Dogecoin',        type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2013-12-15', ccSymbol: 'DOGE' },
  { id: 'polkadot',     symbol: 'DOT',   name: 'Polkadot',        type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2020-08-20', ccSymbol: 'DOT'  },
  { id: 'polygon',      symbol: 'MATIC', name: 'Polygon',         type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2019-04-29', ccSymbol: 'MATIC'},
  { id: 'chainlink',    symbol: 'LINK',  name: 'Chainlink',       type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2017-09-20', ccSymbol: 'LINK' },
  { id: 'uniswap',      symbol: 'UNI',   name: 'Uniswap',         type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2020-09-17', ccSymbol: 'UNI'  },
  { id: 'litecoin',     symbol: 'LTC',   name: 'Litecoin',        type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2013-04-28', ccSymbol: 'LTC'  },
  { id: 'stellar',      symbol: 'XLM',   name: 'Stellar',         type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2014-08-05', ccSymbol: 'XLM'  },
  { id: 'shiba-inu',    symbol: 'SHIB',  name: 'Shiba Inu',       type: 'crypto',    provider: 'cryptocompare', nativeCurrency: 'BRL', minDate: '2020-08-01', ccSymbol: 'SHIB' },

  // ── US Stocks ──────────────────────────────────────────────────────────────
  { id: 'aapl',  symbol: 'AAPL',  name: 'Apple',          type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1980-12-12', yahooTicker: 'AAPL'  },
  { id: 'msft',  symbol: 'MSFT',  name: 'Microsoft',      type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1986-03-13', yahooTicker: 'MSFT'  },
  { id: 'nvda',  symbol: 'NVDA',  name: 'NVIDIA',         type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1999-01-22', yahooTicker: 'NVDA'  },
  { id: 'tsla',  symbol: 'TSLA',  name: 'Tesla',          type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '2010-06-29', yahooTicker: 'TSLA'  },
  { id: 'amzn',  symbol: 'AMZN',  name: 'Amazon',         type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1997-05-15', yahooTicker: 'AMZN'  },
  { id: 'googl', symbol: 'GOOGL', name: 'Alphabet',       type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '2004-08-19', yahooTicker: 'GOOGL' },
  { id: 'meta',  symbol: 'META',  name: 'Meta',           type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '2012-05-18', yahooTicker: 'META'  },
  { id: 'nflx',  symbol: 'NFLX',  name: 'Netflix',        type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '2002-05-23', yahooTicker: 'NFLX'  },
  { id: 'brkb',  symbol: 'BRK-B', name: 'Berkshire Hath.', type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1996-05-09', yahooTicker: 'BRK-B' },
  { id: 'jpm',   symbol: 'JPM',   name: 'JPMorgan Chase', type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1983-01-03', yahooTicker: 'JPM'   },
  { id: 'v',     symbol: 'V',     name: 'Visa',           type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '2008-03-19', yahooTicker: 'V'     },
  { id: 'coin',  symbol: 'COIN',  name: 'Coinbase',       type: 'stock', provider: 'yahoo', nativeCurrency: 'USD', minDate: '2021-04-14', yahooTicker: 'COIN'  },

  // ── ETFs ───────────────────────────────────────────────────────────────────
  { id: 'qqq',  symbol: 'QQQ',  name: 'Nasdaq 100 (QQQ)', type: 'etf', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1999-03-10', yahooTicker: 'QQQ' },
  { id: 'spy',  symbol: 'SPY',  name: 'S&P 500 (SPY)',    type: 'etf', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1993-01-29', yahooTicker: 'SPY' },
  { id: 'dia',  symbol: 'DIA',  name: 'Dow Jones (DIA)',  type: 'etf', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1998-01-20', yahooTicker: 'DIA' },
  { id: 'vt',   symbol: 'VT',   name: 'Global Market (VT)', type: 'etf', provider: 'yahoo', nativeCurrency: 'USD', minDate: '2008-06-24', yahooTicker: 'VT'  },

  // ── Commodities ────────────────────────────────────────────────────────────
  { id: 'gold',   symbol: 'XAU', name: 'Ouro',       type: 'commodity', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1975-01-02', yahooTicker: 'GC=F' },
  { id: 'silver', symbol: 'XAG', name: 'Prata',      type: 'commodity', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1975-01-02', yahooTicker: 'SI=F' },
  { id: 'oil',    symbol: 'WTI', name: 'Petróleo',   type: 'commodity', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1983-04-04', yahooTicker: 'CL=F' },
  { id: 'brent',  symbol: 'BRT', name: 'Brent Crude',type: 'commodity', provider: 'yahoo', nativeCurrency: 'USD', minDate: '1988-05-20', yahooTicker: 'BZ=F' },

  // ── Ações BR (B3) ──────────────────────────────────────────────────────────
  { id: 'petr4',  symbol: 'PETR4',  name: 'Petrobras PN',     type: 'br_stock', provider: 'yahoo', nativeCurrency: 'BRL', minDate: '2000-01-03', yahooTicker: 'PETR4.SA' },
  { id: 'vale3',  symbol: 'VALE3',  name: 'Vale ON',          type: 'br_stock', provider: 'yahoo', nativeCurrency: 'BRL', minDate: '2000-01-03', yahooTicker: 'VALE3.SA' },
  { id: 'itub4',  symbol: 'ITUB4',  name: 'Itaú Unibanco PN', type: 'br_stock', provider: 'yahoo', nativeCurrency: 'BRL', minDate: '2000-01-03', yahooTicker: 'ITUB4.SA' },
  { id: 'bbdc4',  symbol: 'BBDC4',  name: 'Bradesco PN',      type: 'br_stock', provider: 'yahoo', nativeCurrency: 'BRL', minDate: '2000-01-03', yahooTicker: 'BBDC4.SA' },
  { id: 'bbas3',  symbol: 'BBAS3',  name: 'Banco do Brasil',  type: 'br_stock', provider: 'yahoo', nativeCurrency: 'BRL', minDate: '2000-01-03', yahooTicker: 'BBAS3.SA' },
  { id: 'wege3',  symbol: 'WEGE3',  name: 'WEG ON',           type: 'br_stock', provider: 'yahoo', nativeCurrency: 'BRL', minDate: '2000-01-03', yahooTicker: 'WEGE3.SA' },
  { id: 'mglu3',  symbol: 'MGLU3',  name: 'Magalu ON',        type: 'br_stock', provider: 'yahoo', nativeCurrency: 'BRL', minDate: '2011-05-05', yahooTicker: 'MGLU3.SA' },
  { id: 'b3sa3',  symbol: 'B3SA3',  name: 'B3 ON',            type: 'br_stock', provider: 'yahoo', nativeCurrency: 'BRL', minDate: '2017-03-09', yahooTicker: 'B3SA3.SA' },

  // ── Forex ──────────────────────────────────────────────────────────────────
  { id: 'usd-brl', symbol: 'USD', name: 'Dólar Americano', type: 'forex', provider: 'exchangerate', nativeCurrency: 'BRL', minDate: '2000-01-01' },
  { id: 'eur-brl', symbol: 'EUR', name: 'Euro',            type: 'forex', provider: 'exchangerate', nativeCurrency: 'BRL', minDate: '2000-01-01' },
  { id: 'gbp-brl', symbol: 'GBP', name: 'Libra Esterlina', type: 'forex', provider: 'exchangerate', nativeCurrency: 'BRL', minDate: '2000-01-01' },
  { id: 'jpy-brl', symbol: 'JPY', name: 'Iene Japonês',    type: 'forex', provider: 'exchangerate', nativeCurrency: 'BRL', minDate: '2000-01-01' },
  { id: 'btc-usd', symbol: 'BTC', name: 'Bitcoin (USD)',   type: 'forex', provider: 'exchangerate', nativeCurrency: 'BRL', minDate: '2000-01-01' },
];

export const ASSET_MAP = new Map(ASSETS.map(a => [a.id, a]));

export function getAsset(id: string): AssetConfig | undefined {
  return ASSET_MAP.get(id.toLowerCase());
}
