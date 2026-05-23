#!/usr/bin/env python
"""
Ejecuta ETL + forecast.

Por defecto corre la pipeline NUEVA (segmentada, 4+1 segmentos, IC bootstrap,
horizonte 26 semanas, exporta a data/processed/).

Con --legacy también regenera el output antiguo en public/forecast_results.{csv,json}
para que el frontend siga consumiéndolo sin cambios.

Uso:
    python -m analytics.run_pipeline                          # nueva pipeline
    python -m analytics.run_pipeline --legacy                 # nueva + legacy
    python -m analytics.run_pipeline --only-legacy            # solo legacy
    python -m analytics.run_pipeline --horizon 13             # 3 meses
    python -m analytics.run_pipeline --legacy --promo 1       # simular promo legacy
"""

from __future__ import annotations

import argparse

from analytics.config import (
    BACKTEST_CSV,
    FORECAST_CSV,
    FORECAST_HORIZON_WEEKS,
    FORECAST_JSON,
    FORECAST_MONTHLY_CSV,
    FORECAST_WEEKLY_CSV,
    MODEL_METRICS_JSON,
)
from analytics.data_prep import run_etl
from analytics.forecaster import (
    WeeklyVolumeForecaster,
    export_results,
    run_multi_segment_pipeline,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="MarketPulse UK analytics pipeline")
    parser.add_argument("--horizon", type=int, default=FORECAST_HORIZON_WEEKS)
    parser.add_argument(
        "--promo",
        type=int,
        default=None,
        help="Forzar Hay_Promocion (0/1) en semanas futuras (solo legacy)",
    )
    parser.add_argument("--legacy", action="store_true", help="Regenerar también el output legacy en public/")
    parser.add_argument("--only-legacy", action="store_true", help="Solo legacy (sin segmentado)")
    args = parser.parse_args()

    if not args.only_legacy:
        print(f"[*] Pipeline segmentada (horizon={args.horizon}w)...")
        multi = run_multi_segment_pipeline(horizon=args.horizon)
        print(f"  segmentos: {list(multi.per_segment_results.keys())}")
        gm = multi.metrics["metrics_global"]
        print(f"  metricas globales: MAPE={gm.get('mape')}%, WAPE={gm.get('wape')}%, RMSE={gm.get('rmse')}")
        print(f"  -> {FORECAST_WEEKLY_CSV}")
        print(f"  -> {FORECAST_MONTHLY_CSV}")
        print(f"  -> {BACKTEST_CSV}")
        print(f"  -> {MODEL_METRICS_JSON}")

    if args.legacy or args.only_legacy:
        print(f"[*] Pipeline legacy (total UK, public/)...")
        weekly = run_etl()
        model = WeeklyVolumeForecaster(horizon=args.horizon)
        result = model.fit(weekly)
        if args.promo is not None:
            result.future = model.predict_future(steps=args.horizon, hay_promocion=args.promo)
        export_results(result, FORECAST_JSON, FORECAST_CSV)
        print(f"  -> {FORECAST_JSON}")
        print(f"  -> {FORECAST_CSV}")
        m = result.metrics
        print(f"  metricas legacy: MAPE={m.get('mape_holdout_pct')}%, WAPE={m.get('wape_holdout_pct')}%")


if __name__ == "__main__":
    main()
