#!/usr/bin/env python
"""
Ejecuta ETL + forecast y escribe public/forecast_results.json.

Uso:
    python -m analytics.run_pipeline
    python -m analytics.run_pipeline --promo 1 --horizon 6
"""

from __future__ import annotations

import argparse

from analytics.data_prep import run_etl
from analytics.forecaster import WeeklyVolumeForecaster, export_results
from analytics.config import FORECAST_CSV, FORECAST_JSON, FORECAST_HORIZON_WEEKS


def main() -> None:
    parser = argparse.ArgumentParser(description="MarketPulse UK analytics pipeline")
    parser.add_argument("--horizon", type=int, default=FORECAST_HORIZON_WEEKS)
    parser.add_argument(
        "--promo",
        type=int,
        default=None,
        help="Forzar Hay_Promocion (0/1) en semanas futuras para simulación",
    )
    parser.add_argument(
        "--football-impact",
        type=float,
        default=None,
        help="Forzar Impacto_Futbol en semanas futuras",
    )
    parser.add_argument("--damm-only", action="store_true", help="Filtrar solo marcas Damm")
    args = parser.parse_args()

    weekly = run_etl(damm_brands_only=args.damm_only)
    model = WeeklyVolumeForecaster(horizon=args.horizon)
    result = model.fit(weekly)

    if args.promo is not None or args.football_impact is not None:
        result.future = model.predict_future(
            steps=args.horizon,
            hay_promocion=args.promo,
            impacto_futbol=args.football_impact,
        )

    export_results(result, FORECAST_JSON, FORECAST_CSV)
    print(f"OK -> {FORECAST_JSON}")
    print(f"    {FORECAST_CSV}")
    print(f"MAE holdout (Hl): {result.metrics['mae_holdout_hl']:.2f}")


if __name__ == "__main__":
    main()
