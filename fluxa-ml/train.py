"""
Cron job: retreina todos os ativos monitorados.
Sugestão de crontab no Pi:
  0 2 * * * cd ~/fluxa-ml && source .venv/bin/activate && python train.py
"""

from app.data import fetch_features
from app.hmm import train

ASSETS = [
    # BR Stocks
    "PETR4.SA", "VALE3.SA", "ITUB4.SA", "BBDC4.SA", "BBAS3.SA",
    "WEGE3.SA", "MGLU3.SA", "B3SA3.SA",

    # US Stocks
    "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META",
    "NFLX", "BRK-B", "JPM", "V", "COIN",

    # ETFs
    "QQQ", "SPY", "DIA", "VT",

    # Commodities
    "GC=F", "SI=F", "CL=F", "BZ=F",

    # Crypto (Yahoo Finance format)
    "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD",
    "ADA-USD", "AVAX-USD", "DOGE-USD", "DOT-USD", "POL-USD",
    "LINK-USD", "UNI-USD", "LTC-USD", "XLM-USD", "SHIB-USD",
]

for ticker in ASSETS:
    try:
        print(f"Training {ticker}...")
        features, _ = fetch_features(ticker, period="5y")
        train(ticker, features)
        print(f"  OK {ticker}")
    except Exception as e:
        print(f"  FAIL {ticker}: {e}")
