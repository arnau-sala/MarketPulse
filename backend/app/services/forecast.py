"""
Forecast service.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAU — instructions to connect your XGBoost model:

1. Train your model and save it:
       import joblib
       joblib.dump(model, "data/processed/model.pkl")

2. Replace the body of predict_forecast() below with your real logic.
   The function signature must NOT change.

3. You can add optional keyword arguments with defaults if you need
   extra controls (e.g. brand, sku_filter) without touching main.py.

4. Return a list of ForecastPoint objects — the schema is already imported.

Example skeleton:
    import joblib, pandas as pd
    _model = joblib.load("data/processed/model.pkl")

    def predict_forecast(horizon=6, channel=None):
        features = _build_features(horizon, channel)
        predictions = _model.predict(features)
        return [ForecastPoint(...) for p in predictions]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from typing import Optional, List

from app.mocks import MOCK_FORECAST
from app.schemas import ForecastPoint


def predict_forecast(
    horizon: int = 6,
    channel: Optional[str] = None,
) -> List[ForecastPoint]:
    """
    Return the sales forecast time series.

    Args:
        horizon: number of months/weeks ahead to predict.
        channel: optional channel filter ('OFF_TRADE', 'ON_TRADE', 'ONLINE').
                 None returns all channels combined.

    Returns:
        List of ForecastPoint with actual, forecast, target and confidence bands.
    """
    # TODO (Pau): replace this stub with real XGBoost predictions.
    data = MOCK_FORECAST

    if channel is not None:
        channel_map = {
            "OFF_TRADE": "Off-Trade",
            "ON_TRADE": "On-Trade",
            "ONLINE": "Online",
        }
        # Stub: channel filter is a no-op until real data is connected.
        _ = channel_map.get(channel.upper(), channel)

    return [ForecastPoint(**point) for point in data]
