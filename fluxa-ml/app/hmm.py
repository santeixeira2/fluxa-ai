from pathlib import Path
from typing import Literal

import joblib
import numpy as np
from hmmlearn.hmm import GaussianHMM
from sklearn.preprocessing import StandardScaler

RegimeType = Literal["trending_up", "trending_down", "volatile", "mean_reverting"]
MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)
N_COMPONENTS = 4


def train(ticker: str, features: np.ndarray) -> GaussianHMM:
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    model = GaussianHMM(
        n_components=N_COMPONENTS,
        covariance_type="full",
        n_iter=1000,
        random_state=42,
    )
    model.fit(features_scaled)
    joblib.dump({"model": model, "scaler": scaler}, MODELS_DIR / f"{ticker}.pkl")
    return model


def load(ticker: str) -> tuple[GaussianHMM, StandardScaler]:
    path = MODELS_DIR / f"{ticker}.pkl"
    if not path.exists():
        raise FileNotFoundError(f"No trained model found for {ticker}")
    data = joblib.load(path)
    return data["model"], data["scaler"]


def _map_states(model: GaussianHMM) -> dict[int, RegimeType]:
    # rank-based: works correctly with normalized features
    means = model.means_
    returns = means[:, 0]
    volatilities = means[:, 1]

    mapping: dict[int, RegimeType] = {}
    mapping[int(np.argmax(volatilities))] = "volatile"
    mapping[int(np.argmax(returns))] = "trending_up"
    mapping[int(np.argmin(returns))] = "trending_down"
    for i in range(N_COMPONENTS):
        if i not in mapping:
            mapping[i] = "mean_reverting"
    return mapping


def predict(model: GaussianHMM, scaler: StandardScaler, features: np.ndarray) -> tuple[RegimeType, float]:
    features_scaled = scaler.transform(features)
    states = model.predict(features_scaled)
    probs = model.predict_proba(features_scaled)
    current_state = states[-1]
    confidence = float(probs[-1][current_state])
    return _map_states(model)[current_state], confidence


def predict_history(model: GaussianHMM, scaler: StandardScaler, features: np.ndarray, dates) -> list[dict]:
    features_scaled = scaler.transform(features)
    states = model.predict(features_scaled)
    probs = model.predict_proba(features_scaled)
    regime_map = _map_states(model)

    return [
        {
            "date": str(date.date()),
            "regime": regime_map[state],
            "confidence": round(float(probs[i][state]), 4),
        }
        for i, (state, date) in enumerate(zip(states, dates))
    ]
