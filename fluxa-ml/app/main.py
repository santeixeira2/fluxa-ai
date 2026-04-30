import asyncio
import datetime
import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException

from app.data import fetch_features
from app.b3_earnings import get_b3_earnings_sentiment, SUPPORTED_B3_TICKERS
from app.earnings import get_earnings_sentiment, SUPPORTED_TICKERS
from app.hmm import load, predict, predict_history, train
from app.schemas import RegimeHistoryResponse, RegimeResponse, SentimentResponse, TrainRequest, TrainResponse, RiskRequest, RiskResponse
from app.risk import portfolio_risk, fetch_returns

logger = logging.getLogger("fluxa.ml")


async def _warm_sentiment_cache() -> None:
    async def _fetch_us(ticker: str) -> None:
        try:
            await get_earnings_sentiment(ticker)
            logger.info("US sentiment cache warmed: %s", ticker)
        except Exception as exc:
            logger.warning("US sentiment warm failed for %s: %s", ticker, exc)

    async def _fetch_b3(ticker: str) -> None:
        try:
            await get_b3_earnings_sentiment(ticker)
            logger.info("B3 sentiment cache warmed: %s", ticker)
        except Exception as exc:
            logger.warning("B3 sentiment warm failed for %s: %s", ticker, exc)

    await asyncio.gather(
        *[_fetch_us(t) for t in SUPPORTED_TICKERS],
        *[_fetch_b3(t) for t in SUPPORTED_B3_TICKERS],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_warm_sentiment_cache())
    yield


app = FastAPI(title="Fluxa ML", version="2.0.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.datetime.utcnow().isoformat()}


@app.get("/regime", response_model=RegimeResponse)
def get_regime(asset: str, period: str = "2y"):
    try:
        features, _ = fetch_features(asset, period)
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        model, scaler = load(asset)
    except FileNotFoundError:
        raise HTTPException(404, f"No model for {asset}. POST /train first.")

    regime, confidence = predict(model, scaler, features)
    return RegimeResponse(
        asset=asset,
        regime=regime,
        confidence=round(confidence, 4),
        updated_at=datetime.datetime.utcnow().isoformat(),
    )


@app.get("/regime/history", response_model=RegimeHistoryResponse)
def get_regime_history(asset: str, period: str = "2y"):
    try:
        features, dates = fetch_features(asset, period)
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        model, scaler = load(asset)
    except FileNotFoundError:
        raise HTTPException(404, f"No model for {asset}. POST /train first.")

    return RegimeHistoryResponse(asset=asset, history=predict_history(model, scaler, features, dates))


@app.get("/sentiment", response_model=SentimentResponse)
async def get_sentiment(asset: str):
    # B3 tickers arrive with .SA suffix (Yahoo Finance format); strip to check
    import re as _re
    bare = _re.sub(r"\.SA$", "", asset.upper())
    if bare in SUPPORTED_B3_TICKERS:
        result = await get_b3_earnings_sentiment(asset)
    else:
        result = await get_earnings_sentiment(asset)
    return SentimentResponse(**result)

@app.post("/risk", response_model=RiskResponse)
async def risk_endpoint(req: RiskRequest):
    if len(req.tickers) != len(req.weights):
        raise HTTPException(status_code=400, detail="Tickers and weights must have the same length")
    if abs(sum(req.weights) - 1) > 1e-6:
        raise HTTPException(status_code=400, detail="Weights must sum to 1")
    try:
        result = portfolio_risk(req.tickers, req.weights)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/train", response_model=TrainResponse)
def train_assets(req: TrainRequest):
    trained, failed = [], []
    for ticker in req.assets:
        try:
            features, _ = fetch_features(ticker, req.period)
            train(ticker, features)
            trained.append(ticker)
        except Exception:
            failed.append(ticker)
    return TrainResponse(trained=trained, failed=failed)
