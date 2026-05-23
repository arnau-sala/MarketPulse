"""
Forecast service — bridges the analytics pipeline with the FastAPI layer.

Priority:
  1. Real model: runs the analytics ETL + LightGBM (requires UK DATA.xlsx)
  2. Mock fallback: used when data files are not present (dev / demo without data)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAU — the real model is already connected here.
To regenerate or refresh predictions:
    python -m analytics.run_pipeline            (from project root)
    python -m analytics.run_pipeline --promo 1  (simulate promo week)

The Impacto_Futbol feature has been disabled until proper per-match
importance weights are available. See analytics/forecaster.py for details.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional, List

# Make the project root importable so `analytics` can be found
# regardless of where uvicorn is launched from.
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.mocks import MOCK_FORECAST
from app.schemas import ForecastPoint


# ─── Revenue scale ───────────────────────────────────────────────────────────
# Venta Neta in UK DATA.xlsx is in thousands of euros.
# REVENUE_SCALE converts to actual euros; EUR_TO_GBP converts to £.
REVENUE_SCALE: float = 1_000.0
EUR_TO_GBP: float = 0.86   # approximate — update if needed

# ─── Feature flag ────────────────────────────────────────────────────────────
# True = use real LightGBM model + UK DATA.xlsx (requires data files in data/)
# False = use centralised mocks (safe for demo without data files)
USE_REAL_DATA = True

# ─── Lazy model cache ────────────────────────────────────────────────────────
# The model is trained once on first request and cached in memory.
# Re-start the server to retrain with fresh data.

_model_cache: dict = {}


def _build_real_forecast(horizon: int, channel: Optional[str]) -> List[ForecastPoint]:
    """
    Run ETL + LightGBM and return ForecastPoints in £.

    The analytics model predicts volume in Hl. We convert to £ using the
    average historical revenue-per-Hl ratio from the training data.
    """
    from analytics.data_prep import run_etl
    from analytics.forecaster import WeeklyVolumeForecaster
    from analytics.config import TARGET_VOLUME_COL, TARGET_REVENUE_COL

    cache_key = f"model_{horizon}_{channel}"
    if cache_key not in _model_cache:
        weekly = run_etl()

        # Revenue-per-Hl conversion ratio (£ / Hl)
        # Venta Neta is in thousands of EUR → multiply by scale and EUR→GBP
        total_hl = weekly[TARGET_VOLUME_COL].sum()
        total_rev = weekly[TARGET_REVENUE_COL].sum() * REVENUE_SCALE * EUR_TO_GBP
        rev_per_hl: float = total_rev / total_hl if total_hl > 0 else 1.0

        model = WeeklyVolumeForecaster(horizon=horizon)
        result = model.fit(weekly)

        # Monthly target: use the average of the last 3 months of actual revenue
        # as a baseline target, rounded to the nearest 10k
        recent_weekly_rev = (weekly[TARGET_REVENUE_COL].tail(13) * REVENUE_SCALE * EUR_TO_GBP)
        monthly_target_from_data = int(round(recent_weekly_rev.mean() * 4.33 / 10_000) * 10_000)

        _model_cache[cache_key] = {
            "result": result,
            "weekly": weekly,
            "rev_per_hl": rev_per_hl,
            "monthly_target": monthly_target_from_data,
        }

    cached = _model_cache[cache_key]
    result = cached["result"]
    weekly = cached["weekly"]
    rev_per_hl: float = cached["rev_per_hl"]
    monthly_target: int = cached["monthly_target"]

    weeks_in_month = 4.33
    weekly_target = int(monthly_target / weeks_in_month)

    points: List[ForecastPoint] = []

    # Historical rows
    for _, row in result.history.iterrows():
        actual_hl = row["venta_real_historica"]
        actual_rev = (
            int(round(actual_hl * rev_per_hl))
            if actual_hl is not None and actual_hl == actual_hl  # NaN check
            else None
        )
        points.append(
            ForecastPoint(
                date=_fmt_date(row["fecha"]),
                actual=actual_rev,
                target=weekly_target,
                forecast=actual_rev or 0,
                actionForecast=None,
                confidenceLow=None,
                confidenceHigh=None,
            )
        )

    # Future rows
    for _, row in result.future.iterrows():
        pred_hl = row["prediccion_futura"]
        low_hl = row["limite_inferior"]
        high_hl = row["limite_superior"]

        forecast_rev = int(round(pred_hl * rev_per_hl)) if pred_hl == pred_hl else 0
        low_rev = int(round(low_hl * rev_per_hl)) if low_hl == low_hl else None
        high_rev = int(round(high_hl * rev_per_hl)) if high_hl == high_hl else None

        # Action forecast: simulate 15% uplift with promo active
        action_rev = int(forecast_rev * 1.15)

        points.append(
            ForecastPoint(
                date=_fmt_date(row["fecha"]),
                actual=None,
                target=weekly_target,
                forecast=forecast_rev,
                actionForecast=action_rev,
                confidenceLow=low_rev,
                confidenceHigh=high_rev,
            )
        )

    return points


def _fmt_date(iso_date: str) -> str:
    """Convert '2026-05-04' → 'May 04' to match frontend format."""
    from datetime import datetime
    try:
        dt = datetime.strptime(iso_date, "%Y-%m-%d")
        return dt.strftime("%b %d")
    except ValueError:
        return iso_date


def predict_forecast(
    horizon: int = 6,
    channel: Optional[str] = None,
) -> List[ForecastPoint]:
    """
    Return the sales forecast time series.

    Args:
        horizon: number of weeks ahead to predict.
        channel: optional channel filter. Currently applies to the ETL
                 but the model predicts total UK volume. Channel-level
                 models can be added per segment when data volume allows.

    Returns:
        List of ForecastPoint with actual/forecast/target in £ and
        confidence bands. Falls back to mock data if real data is unavailable.
    """
    if not USE_REAL_DATA:
        return [ForecastPoint(**p) for p in MOCK_FORECAST]

    try:
        return _build_real_forecast(horizon, channel)
    except FileNotFoundError:
        # Data files not present — use mocks for demo / development
        return [ForecastPoint(**p) for p in MOCK_FORECAST]
    except Exception as exc:
        # Any other model error — log and fall back to mocks
        import logging
        logging.getLogger(__name__).warning(
            "Real forecast failed (%s), falling back to mocks.", exc
        )
        return [ForecastPoint(**p) for p in MOCK_FORECAST]
