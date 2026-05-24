"""
Data-reader service — reads data/processed/ outputs and converts them into
the shapes expected by the API endpoints.

All functions fall back gracefully to mock values if the files are missing,
so the backend never breaks during demo setup.
"""

from __future__ import annotations

import json
import pathlib
from datetime import datetime, timezone
from typing import Optional

import logging

_LOG = logging.getLogger(__name__)

_ROOT = pathlib.Path(__file__).resolve().parents[3]
_FORECAST_CSV = _ROOT / "data" / "processed" / "forecast_weekly.csv"
_METRICS_JSON = _ROOT / "data" / "processed" / "model_metrics.json"
_MULTIPLIERS_JSON = _ROOT / "data" / "processed" / "calibrated_multipliers.json"
_WEEKLY_FEATURES = _ROOT / "data" / "weekly_features.csv"

# Demo planning target (no real budget file available for the demo)
DEMO_MONTHLY_TARGET = 1_200_000
DEMO_MONTH = "2026-05"
DEMO_MONTH_LABEL = "May 2026"
REVENUE_PER_HL_FALLBACK = 228.0


def _revenue_per_hl() -> float:
    """Derive revenue/Hl ratio from weekly_features.csv; fallback to £228/Hl."""
    try:
        import pandas as pd
        wf = pd.read_csv(_WEEKLY_FEATURES)
        total_hl = wf["Hl"].sum()
        total_rev = wf["Venta Neta"].sum() * 1_000 * 0.86
        if total_hl > 0:
            return total_rev / total_hl
    except Exception as exc:
        _LOG.debug("revenue_per_hl fallback: %s", exc)
    return REVENUE_PER_HL_FALLBACK


def _may_forecast_gbp() -> Optional[int]:
    """
    Sum forecast_weekly.csv rows for May 2026 (tipo=forecast) in the
    total_uk_retail segment and convert to £.
    Returns None if the CSV is missing or has no May 2026 rows.
    """
    if not _FORECAST_CSV.exists():
        return None
    try:
        import pandas as pd
        df = pd.read_csv(_FORECAST_CSV, parse_dates=["fecha"])
        total = df[df["segmento"] == "total_uk_retail"]
        if total.empty:
            # Fallback: sum individual segments
            total = df[df["segmento"] != "total_uk_retail"].groupby("fecha", as_index=False).agg(
                prediccion=("prediccion", "sum"),
                venta_real=("venta_real", "sum"),
                tipo=("tipo", "first"),
            )

        may = total[
            (total["fecha"].dt.year == 2026) &
            (total["fecha"].dt.month == 5)
        ]
        if may.empty:
            return None

        rev_per_hl = _revenue_per_hl()

        forecast_rows = may[may["tipo"] == "forecast"]
        if not forecast_rows.empty:
            hl = forecast_rows["prediccion"].sum()
        else:
            hl = may["venta_real"].sum()

        return int(round(float(hl) * rev_per_hl))
    except Exception as exc:
        _LOG.warning("may_forecast_gbp failed: %s", exc)
        return None


def _mtd_sales_gbp() -> Optional[int]:
    """
    Estimate month-to-date sales for May 2026 from historical rows
    (tipo=historico) in the total_uk_retail segment, if available.
    """
    if not _FORECAST_CSV.exists():
        return None
    try:
        import pandas as pd
        df = pd.read_csv(_FORECAST_CSV, parse_dates=["fecha"])
        total = df[
            (df["segmento"] == "total_uk_retail") &
            (df["tipo"] == "historico") &
            (df["fecha"].dt.year == 2026) &
            (df["fecha"].dt.month == 5)
        ]
        if total.empty:
            return None
        rev_per_hl = _revenue_per_hl()
        return int(round(float(total["venta_real"].sum()) * rev_per_hl))
    except Exception as exc:
        _LOG.debug("mtd_sales_gbp failed: %s", exc)
        return None


def get_monthly_metrics() -> dict:
    """
    Build MonthlyMetrics from real data where available; fill with demo constants otherwise.
    """
    from app.mocks import MOCK_METRICS

    baseline_forecast = _may_forecast_gbp() or MOCK_METRICS["baselineForecast"]
    sales_to_date = _mtd_sales_gbp() or MOCK_METRICS["salesToDate"]
    monthly_target = DEMO_MONTHLY_TARGET
    expected_gap = baseline_forecast - monthly_target

    # Hit probability: simple linear model — 34% at gap -120k, scales with gap
    gap_ratio = expected_gap / monthly_target  # negative when below
    hit_probability = max(5, min(95, int(50 + gap_ratio * 200)))

    if expected_gap >= 0:
        status = "On Track"
    elif expected_gap >= -monthly_target * 0.05:
        status = "At Risk"
    else:
        status = "Critical"

    return {
        "market": "UK",
        "month": DEMO_MONTH_LABEL,
        "salesToDate": sales_to_date,
        "monthlyTarget": monthly_target,
        "baselineForecast": baseline_forecast,
        "expectedGap": expected_gap,
        "hitProbability": hit_probability,
        "status": status,
        "lastUpdated": datetime.now(timezone.utc).strftime("Today · %H:%M"),
    }


def get_backtest_metrics() -> dict:
    """
    Build BacktestResult from model_metrics.json if available.
    Returns mock data if the file is missing.
    """
    from app.mocks import MOCK_BACKTEST

    if not _METRICS_JSON.exists():
        return dict(MOCK_BACKTEST)

    try:
        with open(_METRICS_JSON, encoding="utf-8") as f:
            m = json.load(f)

        global_metrics = m.get("metrics_global", {})
        retail_metrics = m.get("metrics_by_segment", {}).get("total_uk_retail", {})

        mape = retail_metrics.get("mape", global_metrics.get("mape", MOCK_BACKTEST["mape"]))
        wape = retail_metrics.get("wape", global_metrics.get("wape", MOCK_BACKTEST["wape"]))

        return {
            "mape": round(float(mape), 1),
            "wape": round(float(wape), 1),
            "historicalForecastVsActual": MOCK_BACKTEST["historicalForecastVsActual"],
            "counterfactualValue": MOCK_BACKTEST["counterfactualValue"],
            "counterfactualExplanation": (
                "Forecast is directional — MarketPulse value is in converting risk into action, "
                "not in prediction precision. "
                f"Total UK retail WAPE: {round(float(wape), 1)}%, MAPE: {round(float(mape), 1)}%. "
                "If MarketPulse had been active in Q3/Q4 2025, it would have detected the gap "
                "3 weeks earlier and recommended actions worth approximately £180,000 of recovered revenue."
            ),
        }
    except Exception as exc:
        _LOG.warning("get_backtest_metrics failed: %s", exc)
        return dict(MOCK_BACKTEST)
