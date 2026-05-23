"""
Modelo de forecasting semanal con LightGBM y regresores externos.

Regresores simulables desde la UI: Hay_Promocion, Impacto_Futbol.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_absolute_error

from analytics.config import (
    CONFIDENCE_Z,
    FORECAST_CSV,
    FORECAST_HORIZON_WEEKS,
    FORECAST_JSON,
    TARGET_VOLUME_COL,
)
from analytics.data_prep import run_etl


REGRESSORS = ["Hay_Promocion", "Impacto_Futbol"]
FEATURE_COLS = [
    "semana_idx",
    "anio",
    "mes",
    "semana_anio",
    "Hay_Promocion",
    "Impacto_Futbol",
    "num_retailers_en_promo",
    "lag_1",
    "lag_4",
    "rolling_mean_4",
]


@dataclass
class ForecastResult:
    history: pd.DataFrame
    future: pd.DataFrame
    metrics: dict[str, float]

    @property
    def export_frame(self) -> pd.DataFrame:
        hist = self.history.copy()
        hist["tipo"] = "historico"
        fut = self.future.copy()
        fut["tipo"] = "forecast"
        combined = pd.concat([hist, fut], ignore_index=True)
        return combined[
            [
                "fecha",
                "tipo",
                "venta_real_historica",
                "prediccion_futura",
                "limite_inferior",
                "limite_superior",
                "Hay_Promocion",
                "Impacto_Futbol",
            ]
        ]


class WeeklyVolumeForecaster:
    """Forecast de volumen (Hl) con intervalos aproximados por residuos."""

    def __init__(self, horizon: int = FORECAST_HORIZON_WEEKS) -> None:
        self.horizon = horizon
        self.model = LGBMRegressor(
            n_estimators=400,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42,
            verbose=-1,
        )
        self._residual_std: float = 0.0
        self._last_row: pd.Series | None = None
        self._weekly: pd.DataFrame | None = None

    @staticmethod
    def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
        out = df.sort_values("semana_inicio").copy()
        target = TARGET_VOLUME_COL
        out["lag_1"] = out[target].shift(1)
        out["lag_4"] = out[target].shift(4)
        out["rolling_mean_4"] = out[target].shift(1).rolling(4, min_periods=1).mean()
        return out.dropna(subset=["lag_1", "lag_4"])

    def fit(self, weekly: pd.DataFrame) -> ForecastResult:
        self._weekly = weekly.copy()
        data = self.add_lag_features(weekly)
        train_end = len(data) - self.horizon
        if train_end < 12:
            train_end = max(12, len(data) - 4)

        train = data.iloc[:train_end]
        test = data.iloc[train_end : train_end + self.horizon]

        x_train = train[FEATURE_COLS]
        y_train = train[TARGET_VOLUME_COL]
        self.model.fit(x_train, y_train)

        if len(test) > 0:
            preds = self.model.predict(test[FEATURE_COLS])
            self._residual_std = float(np.std(test[TARGET_VOLUME_COL] - preds))
            mae = float(mean_absolute_error(test[TARGET_VOLUME_COL], preds))
        else:
            holdout = train.tail(8)
            preds = self.model.predict(holdout[FEATURE_COLS])
            self._residual_std = float(np.std(holdout[TARGET_VOLUME_COL] - preds))
            mae = float(mean_absolute_error(holdout[TARGET_VOLUME_COL], preds))

        self._last_row = data.iloc[-1]
        history = self._build_history_frame(data.iloc[:train_end])
        future = self.predict_future(
            steps=self.horizon,
            hay_promocion=None,
            impacto_futbol=None,
        )
        metrics = {"mae_holdout_hl": mae, "residual_std_hl": self._residual_std}
        return ForecastResult(history=history, future=future, metrics=metrics)

    def _build_history_frame(self, data: pd.DataFrame) -> pd.DataFrame:
        margin = CONFIDENCE_Z * self._residual_std
        return pd.DataFrame(
            {
                "fecha": data["semana_inicio"].dt.strftime("%Y-%m-%d"),
                "venta_real_historica": data[TARGET_VOLUME_COL].round(2),
                "prediccion_futura": np.nan,
                "limite_inferior": np.nan,
                "limite_superior": np.nan,
                "Hay_Promocion": data["Hay_Promocion"].astype(int),
                "Impacto_Futbol": data["Impacto_Futbol"].round(2),
            }
        )

    def predict_future(
        self,
        *,
        steps: int | None = None,
        hay_promocion: int | None = None,
        impacto_futbol: float | None = None,
    ) -> pd.DataFrame:
        if self._last_row is None or self._weekly is None:
            raise RuntimeError("El modelo no está entrenado. Llama a fit() primero.")

        n_steps = steps or self.horizon
        row = self._last_row.copy()
        future_rows: list[dict[str, Any]] = []
        margin = CONFIDENCE_Z * self._residual_std
        last_date: pd.Timestamp = row["semana_inicio"]

        volume_history = list(self._weekly[TARGET_VOLUME_COL].tail(8))

        for step in range(1, n_steps + 1):
            next_date = last_date + pd.Timedelta(days=7)
            promo = (
                int(hay_promocion)
                if hay_promocion is not None
                else int(row.get("Hay_Promocion", 0))
            )
            football = (
                float(impacto_futbol)
                if impacto_futbol is not None
                else float(row.get("Impacto_Futbol", 0))
            )

            features = {
                "semana_idx": int(row["semana_idx"]) + step,
                "anio": next_date.year,
                "mes": next_date.month,
                "semana_anio": int(next_date.isocalendar().week),
                "Hay_Promocion": promo,
                "Impacto_Futbol": football,
                "num_retailers_en_promo": int(row.get("num_retailers_en_promo", 0)),
                "lag_1": volume_history[-1] if volume_history else float(row[TARGET_VOLUME_COL]),
                "lag_4": volume_history[-4] if len(volume_history) >= 4 else volume_history[0],
                "rolling_mean_4": float(np.mean(volume_history[-4:])),
            }

            yhat = float(self.model.predict(pd.DataFrame([features])[FEATURE_COLS])[0])
            yhat = max(0.0, yhat)
            volume_history.append(yhat)

            future_rows.append(
                {
                    "fecha": next_date.strftime("%Y-%m-%d"),
                    "venta_real_historica": np.nan,
                    "prediccion_futura": round(yhat, 2),
                    "limite_inferior": round(max(0.0, yhat - margin), 2),
                    "limite_superior": round(yhat + margin, 2),
                    "Hay_Promocion": promo,
                    "Impacto_Futbol": round(football, 2),
                }
            )
            last_date = next_date

        return pd.DataFrame(future_rows)


def _records_for_json(frame: pd.DataFrame) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for row in frame.to_dict(orient="records"):
        clean: dict[str, Any] = {}
        for key, value in row.items():
            if value is None or (isinstance(value, float) and not np.isfinite(value)):
                clean[key] = None
            elif isinstance(value, (np.floating, np.integer)):
                clean[key] = float(value)
            else:
                clean[key] = value
        records.append(clean)
    return records


def export_results(result: ForecastResult, json_path: Path, csv_path: Path) -> None:
    frame = result.export_frame
    frame.to_csv(csv_path, index=False)

    payload = {
        "meta": {
            "target": TARGET_VOLUME_COL,
            "unit": "hectoliters",
            "horizon_weeks": FORECAST_HORIZON_WEEKS,
            "model": "LightGBM",
            "regressors": REGRESSORS,
            "metrics": result.metrics,
        },
        "series": _records_for_json(frame),
    }
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def run_forecast_pipeline() -> ForecastResult:
    weekly = run_etl()
    model = WeeklyVolumeForecaster()
    result = model.fit(weekly)
    export_results(result, FORECAST_JSON, FORECAST_CSV)
    return result


if __name__ == "__main__":
    out = run_forecast_pipeline()
    print("Métricas:", out.metrics)
    print(out.export_frame.tail(10).to_string())
