import numpy as np
import pandas as pd
import yfinance as yf
from datetime import date

STRESS_START = "2020-02-20"
STRESS_END = "2020-03-23"

def fetch_returns(tickers: list[str], period: str = "1y") -> pd.DataFrame:
    raw = yf.download(tickers, period=period, auto_adjust=True, progress=False)["Close"]
    if isinstance(raw, pd.Series):
        raw = raw.to_frame(tickers[0])
    raw = raw.dropna(axis=1, how='all')  # drop tickers with no data at all
    returns = np.log(raw / raw.shift(1)).dropna()
    return returns

def portfolio_risk(tickers: list[str], weights: list[float]) -> dict:
    w = np.array(weights)
    R = fetch_returns(tickers)

    if R.empty or R.shape[0] < 5:
        raise ValueError(f"Insufficient historical data for tickers: {tickers}")

    # Re-align weights if some tickers were dropped due to missing data
    valid_tickers = list(R.columns)
    if len(valid_tickers) < len(tickers):
        idx = [tickers.index(t) for t in valid_tickers if t in tickers]
        w = np.array([weights[i] for i in idx])
        w = w / w.sum()
        tickers = valid_tickers

    covariance = R.cov().values
    portfolio_var = w @ covariance @ w
    portfolio_vol = float(np.sqrt(portfolio_var * 252))

    portfolio_ret = float((R @ w).mean() * 252)
    sharpe        = portfolio_ret / portfolio_vol if portfolio_vol > 0 else 0

    R_c = R.values - R.values.mean(axis=0)
    _, S, Vt = np.linalg.svd(R_c, full_matrices=False)
    variance_explained = (S ** 2) / (S ** 2).sum()
    market_factor_pct = float(variance_explained[0])

    marginal = covariance @ w
    contrib = marginal * w / portfolio_var if portfolio_var > 0 else w * 0
    asset_contrib = [ 
        {"ticker": t, "riskContribution": float(c)}
        for t, c in zip(tickers, contrib)
    ]

    try:
        raw_stress = yf.download(
            tickers, start=STRESS_START, end=STRESS_END,
            auto_adjust=True, progress=False
        )["Close"]
        if isinstance(raw_stress, pd.Series):
            raw_stress = raw_stress.to_frame(tickers[0])
        R_stress = np.log(raw_stress / raw_stress.shift(1)).dropna()
        cov_stress = R_stress.cov().values
        stress_var = w @ cov_stress @ w
        stress_daily = float((R_stress.values @ w).sum())
        stress_loss = stress_daily
    except Exception:
        stress_loss = None

    return {
        "annualizedVol": portfolio_vol,
        "annualizedReturn": portfolio_ret,
        "sharpe": sharpe,
        "marketFactorExposure": market_factor_pct,
        "assetContributions": asset_contrib,
        "stressLoss": stress_loss,
        "stressPeriod": f"{STRESS_START} / {STRESS_END}",
    }                                
