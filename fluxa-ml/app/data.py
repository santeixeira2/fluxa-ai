import numpy as np
import pandas as pd
import requests
import yfinance as yf


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })
    return s


def fetch_features(ticker: str, period: str = "5y") -> tuple[np.ndarray, pd.DatetimeIndex]:
    t = yf.Ticker(ticker, session=_session())
    df = t.history(period=period, auto_adjust=True)

    if df.empty:
        raise ValueError(f"Insufficient data for {ticker}")

    if len(df) < 60:
        raise ValueError(f"Insufficient data for {ticker}")

    df["log_return"] = np.log(df["Close"] / df["Close"].shift(1))
    df["volatility"] = df["log_return"].rolling(20).std()
    df["trend"] = df["log_return"].rolling(20).mean()
    df["volume_ratio"] = df["Volume"] / df["Volume"].rolling(20).mean()
    df = df.dropna()

    features = df[["log_return", "volatility", "trend", "volume_ratio"]].values
    return features, df.index
