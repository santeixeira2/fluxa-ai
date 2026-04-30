from pydantic import BaseModel
from typing import Literal, Optional

RegimeType = Literal[ "trending_up", "trending_down", "volatile", "mean_reverting" ]

class RiskRequest(BaseModel):
    tickers: list[str]
    weights: list[float]

class assetContribution(BaseModel):
    ticker: str
    riskContribution: float

class RiskResponse(BaseModel):
    annualizedVol: float
    annualizedReturn: float
    sharpe: float
    marketFactorExposure: float
    assetContributions: list[assetContribution]
    stressLoss: float | None
    stressPeriod: str

class RegimeResponse(BaseModel):
    asset: str
    regime: RegimeType
    confidence: float
    updated_at: str

class RegimeHistoryItem(BaseModel):
    date: str
    regime: RegimeType
    confidence: float

class RegimeHistoryResponse(BaseModel):
    asset: str
    history: list[RegimeHistoryItem]

class TrainRequest(BaseModel):
    assets: list[str]
    period: str = "5y"

class TrainResponse(BaseModel):
    trained: list[str]
    failed: list[str]

# ── Earnings Sentiment ──────────────────────────────────────────────────────

GuidanceType = Literal["raised", "lowered", "maintained", "none"]
ToneType = Literal["confident", "cautious", "neutral"]

class SentimentQuarter(BaseModel):
    period: str
    date: str
    sentiment: float
    guidance: GuidanceType
    tone: ToneType
    beats_estimates: Optional[bool]
    summary: str

class SentimentResponse(BaseModel):
    ticker: str
    available: bool
    quarters: list[SentimentQuarter]
    error: Optional[str]
