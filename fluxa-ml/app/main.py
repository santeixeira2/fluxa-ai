import datetime

from fastapi import FastAPI, HTTPException

from app.data import fetch_features
from app.earnings import get_earnings_sentiment
from app.hmm import load, predict, predict_history, train
from app.schemas import RegimeHistoryResponse, RegimeResponse, SentimentResponse, TrainRequest, TrainResponse

app = FastAPI(title="Fluxa ML", version="2.0.0")


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
    result = await get_earnings_sentiment(asset)
    return SentimentResponse(**result)


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
