"""
Forecasting MarketPulse UK — LightGBM segmentado con IC por bootstrap de residuos.

Diseño:
- Un modelo LightGBM por segmento (4 segmentos retail + agregado total).
- Walk-forward backtest con K orígenes para:
    (a) obtener residuos por horizonte → IC que crece con el paso.
    (b) generar backtest_results.csv y métricas (MAPE / WAPE / RMSE).
- Forecast recursivo a 26 semanas, sin hueco temporal (siguiente lunes).
- Compatibilidad: WeeklyVolumeForecaster sigue existiendo con la API antigua
  para no romper backend/app/services/forecast.py ni el frontend.

NOTA — Limitación promociones históricas (problema 6 del prompt):
  El Trade Plan solo aporta promos 2026. El histórico 2023-2025 tiene
  Hay_Promocion=0 casi siempre, así que el coeficiente que aprende el
  modelo para esta feature es ruidoso. Se documenta en model_metrics.json.

NOTA — Impacto_Futbol: la columna se mantiene a 0 en outputs por compatibilidad
  pero NO se usa como feature (igual que antes — todos los partidos pesaban
  lo mismo, lo cual distorsionaba el modelo).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from analytics.config import (
    BACKTEST_CSV,
    BACKTEST_ORIGINS,
    BACKTEST_STEP_WEEKS,
    CI_HORIZON_WINDOW,
    CONFIDENCE_Z,
    FORECAST_CSV,
    FORECAST_HORIZON_WEEKS,
    FORECAST_JSON,
    FORECAST_MONTHLY_CSV,
    FORECAST_WEEKLY_CSV,
    MODEL_METRICS_JSON,
    SEGMENTS,
    TARGET_VOLUME_COL,
)
from analytics.data_prep import (
    build_segment_panels,
    count_bank_holidays_in_week,
    run_etl,
    _CLIM_TEMP_BY_MONTH,
    _CLIM_SUN_BY_MONTH,
)


REGRESSORS = ["Hay_Promocion", "n_bank_holidays", "temp_media_semana", "horas_sol_semana"]
FEATURE_COLS = [
    "semana_idx",
    "anio",
    "mes",
    "semana_anio",
    "Hay_Promocion",
    "num_retailers_en_promo",
    "lag_1",
    "lag_4",
    "lag_12",
    "rolling_mean_4",
    "rolling_mean_12",
    "n_bank_holidays",     # festivos UK en la semana
    "temp_media_semana",   # temperatura media semanal (°C)
    "horas_sol_semana",    # horas de sol totales en la semana
]


def _compute_clim_weather(panel: pd.DataFrame) -> dict[int, dict[str, float]]:
    """
    Calcula medias climatológicas de temperatura y sol por semana ISO.
    Se usan para las semanas futuras del forecast donde no hay datos reales.
    """
    if "temp_media_semana" not in panel.columns:
        return {}
    df = panel.copy()
    df["_iso"] = df["semana_inicio"].apply(
        lambda ts: int(pd.Timestamp(ts).isocalendar().week)
    )
    clim: dict[int, dict[str, float]] = {}
    for iso_week, grp in df.groupby("_iso"):
        clim[int(iso_week)] = {
            "temp_media_semana": float(grp["temp_media_semana"].mean()),
            "horas_sol_semana": float(grp["horas_sol_semana"].mean())
            if "horas_sol_semana" in grp.columns
            else _CLIM_SUN_BY_MONTH.get(int((iso_week - 1) // 4) + 1, 35.0),
        }
    return clim

MODEL_NAME = "lightgbm"


def _new_model() -> LGBMRegressor:
    return LGBMRegressor(
        n_estimators=400,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        verbose=-1,
    )


def _add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.sort_values("semana_inicio").copy()
    target = TARGET_VOLUME_COL
    out["lag_1"] = out[target].shift(1)
    out["lag_4"] = out[target].shift(4)
    out["lag_12"] = out[target].shift(12)
    out["rolling_mean_4"] = out[target].shift(1).rolling(4, min_periods=1).mean()
    out["rolling_mean_12"] = out[target].shift(1).rolling(12, min_periods=1).mean()
    return out


# ---------------------------------------------------------------------------
# Forecaster por segmento
# ---------------------------------------------------------------------------


@dataclass
class SegmentForecastResult:
    segment_id: str
    channel: str
    brand: str
    history: pd.DataFrame      # filas históricas con venta_real (snake_case)
    future: pd.DataFrame       # filas forecast con prediccion + IC 80/95
    residuals_by_h: dict[int, list[float]]  # residuos del backtest por horizonte
    metrics: dict[str, float]  # mape, wape, rmse del backtest


class SegmentForecaster:
    """Modelo LightGBM para un único segmento, con IC por bootstrap residual."""

    def __init__(self, segment_id: str, channel: str, brand: str, horizon: int = FORECAST_HORIZON_WEEKS) -> None:
        self.segment_id = segment_id
        self.channel = channel
        self.brand = brand
        self.horizon = horizon
        self._final_model: LGBMRegressor | None = None
        self._panel: pd.DataFrame | None = None  # panel original (sin lags) para inferencia

    # --- Internals ---------------------------------------------------------

    def _fit_one(self, train: pd.DataFrame) -> LGBMRegressor:
        model = _new_model()
        usable = train.dropna(subset=["lag_1", "lag_4"])
        if len(usable) < 12:
            # demasiado pocos datos: fallback rellenando NaN en lag features
            usable = train.bfill().ffill()
        model.fit(usable[FEATURE_COLS], usable[TARGET_VOLUME_COL])
        return model

    def _recursive_forecast(
        self,
        model: LGBMRegressor,
        seed_panel: pd.DataFrame,
        n_steps: int,
        promos_future: dict[pd.Timestamp, int] | None = None,
        clim_weather: dict[int, dict[str, float]] | None = None,
    ) -> pd.DataFrame:
        """
        Predicción recursiva n_steps semanas a partir del último punto de seed_panel.

        seed_panel debe contener al menos las últimas 12 semanas históricas reales.
        promos_future: opcional, mapa fecha→Hay_Promocion. Si no, usa último valor.
        """
        history_values = list(seed_panel[TARGET_VOLUME_COL].values)
        last_date: pd.Timestamp = seed_panel["semana_inicio"].iloc[-1]
        last_idx = int(seed_panel["semana_idx"].iloc[-1])
        last_promo = int(seed_panel["Hay_Promocion"].iloc[-1])
        last_retailers = int(seed_panel.get("num_retailers_en_promo", pd.Series([0])).iloc[-1])

        rows: list[dict[str, Any]] = []
        for step in range(1, n_steps + 1):
            next_date = last_date + pd.Timedelta(days=7)
            iso_week = int(next_date.isocalendar().week)
            month = next_date.month

            promo = (
                promos_future.get(next_date, last_promo)
                if promos_future is not None
                else last_promo
            )

            # Clima futuro: usa climatología por semana ISO si está disponible,
            # sino fallback por mes
            clim = (clim_weather or {}).get(iso_week, {})
            temp = clim.get("temp_media_semana", _CLIM_TEMP_BY_MONTH.get(month, 10.0))
            sol = clim.get("horas_sol_semana", _CLIM_SUN_BY_MONTH.get(month, 35.0))

            lag_1 = history_values[-1]
            lag_4 = history_values[-4] if len(history_values) >= 4 else history_values[0]
            lag_12 = history_values[-12] if len(history_values) >= 12 else history_values[0]
            rm_4 = float(np.mean(history_values[-4:])) if history_values else 0.0
            rm_12 = float(np.mean(history_values[-12:])) if history_values else 0.0

            features = {
                "semana_idx": last_idx + step,
                "anio": next_date.year,
                "mes": month,
                "semana_anio": iso_week,
                "Hay_Promocion": promo,
                "num_retailers_en_promo": last_retailers,
                "lag_1": lag_1,
                "lag_4": lag_4,
                "lag_12": lag_12,
                "rolling_mean_4": rm_4,
                "rolling_mean_12": rm_12,
                "n_bank_holidays": count_bank_holidays_in_week(next_date.normalize()),
                "temp_media_semana": round(temp, 2),
                "horas_sol_semana": round(sol, 1),
            }

            yhat = float(model.predict(pd.DataFrame([features])[FEATURE_COLS])[0])
            yhat = max(0.0, yhat)
            history_values.append(yhat)

            rows.append({
                "fecha": next_date.normalize(),
                "horizon_step": step,
                "prediccion": yhat,
                "hay_promocion": int(promo),
            })
            last_date = next_date

        return pd.DataFrame(rows)

    # --- Backtest ----------------------------------------------------------

    def walk_forward_backtest(self, panel: pd.DataFrame) -> tuple[dict[int, list[float]], pd.DataFrame]:
        """
        Walk-forward backtest con BACKTEST_ORIGINS orígenes separados
        BACKTEST_STEP_WEEKS semanas. Devuelve:
          - residuals_by_h: {h: [residuos en horizonte h]}
          - backtest_df: filas (fecha, real, prediccion_holdout, error_abs, error_pct)
        """
        data = _add_lag_features(panel)
        residuals_by_h: dict[int, list[float]] = {}
        backtest_records: list[dict[str, Any]] = []

        n = len(data)
        # Origenes: los últimos BACKTEST_ORIGINS * BACKTEST_STEP_WEEKS puntos, separados por step
        total_holdout_weeks = BACKTEST_ORIGINS * BACKTEST_STEP_WEEKS
        if n - total_holdout_weeks < 26:
            # No hay suficientes datos para backtest completo: reducimos
            origins = max(1, (n - 26) // BACKTEST_STEP_WEEKS)
        else:
            origins = BACKTEST_ORIGINS

        if origins < 1:
            return {}, pd.DataFrame()

        for k in range(origins):
            # train_end_idx = punto de corte: entrenar con [0, train_end), predecir [train_end, train_end+H)
            train_end_idx = n - (origins - k) * BACKTEST_STEP_WEEKS
            if train_end_idx < 24:
                continue
            train = data.iloc[:train_end_idx]
            test = data.iloc[train_end_idx : train_end_idx + self.horizon]
            if len(test) == 0:
                continue

            model = self._fit_one(train)

            # Forecast recursivo desde el último punto de train usando reales en lags iniciales
            seed = train.tail(12)[["semana_inicio", "semana_idx", TARGET_VOLUME_COL, "Hay_Promocion", "num_retailers_en_promo"]].copy()
            promos_future = {
                pd.Timestamp(row["semana_inicio"]).normalize(): int(row["Hay_Promocion"])
                for _, row in test.iterrows()
            }
            clim_bt = _compute_clim_weather(train)
            preds = self._recursive_forecast(
                model, seed, n_steps=len(test),
                promos_future=promos_future, clim_weather=clim_bt,
            )

            for h_step, (_, test_row) in enumerate(test.iterrows(), start=1):
                pred_row = preds.iloc[h_step - 1]
                real = float(test_row[TARGET_VOLUME_COL])
                pred = float(pred_row["prediccion"])
                resid = real - pred
                residuals_by_h.setdefault(h_step, []).append(resid)
                err_abs = abs(resid)
                err_pct = (err_abs / real * 100.0) if real > 1e-9 else np.nan
                backtest_records.append({
                    "fecha": pd.Timestamp(test_row["semana_inicio"]).strftime("%Y-%m-%d"),
                    "real": round(real, 2),
                    "prediccion_holdout": round(pred, 2),
                    "error_abs": round(err_abs, 2),
                    "error_pct": round(err_pct, 2) if not np.isnan(err_pct) else None,
                    "horizon_step": h_step,
                    "segmento": self.segment_id,
                })

        return residuals_by_h, pd.DataFrame(backtest_records)

    # --- Pipeline ----------------------------------------------------------

    def fit_and_forecast(self, panel: pd.DataFrame) -> SegmentForecastResult:
        if panel.empty or len(panel) < 24:
            return SegmentForecastResult(
                segment_id=self.segment_id,
                channel=self.channel,
                brand=self.brand,
                history=pd.DataFrame(),
                future=pd.DataFrame(),
                residuals_by_h={},
                metrics={"mape": np.nan, "wape": np.nan, "rmse": np.nan, "n_train_weeks": len(panel)},
            )

        self._panel = panel.copy()

        # 1) Backtest walk-forward → residuos por horizonte y métricas
        residuals_by_h, backtest_df = self.walk_forward_backtest(panel)

        # 2) Entrenar modelo final con TODOS los datos
        data = _add_lag_features(panel)
        self._final_model = self._fit_one(data)

        # 3) Forecast recursivo H semanas
        seed = data.tail(12)[["semana_inicio", "semana_idx", TARGET_VOLUME_COL, "Hay_Promocion", "num_retailers_en_promo"]].copy()
        promos_future = self._extract_future_promos(panel)
        clim_weather = _compute_clim_weather(panel)
        preds_df = self._recursive_forecast(
            self._final_model, seed, n_steps=self.horizon,
            promos_future=promos_future, clim_weather=clim_weather,
        )

        # 4) Calcular IC 80% y 95% por horizonte usando residuos del backtest
        future_with_ci = self._apply_bootstrap_ci(preds_df, residuals_by_h)

        # 5) Frame histórico (todas las filas reales)
        history = self._build_history_frame(panel)

        # 6) Métricas globales del backtest
        metrics = self._compute_metrics(backtest_df)
        metrics["n_train_weeks"] = len(panel)

        # Adjunta backtest_df al residuals dict para que MultiSegment lo pueda volcar
        # (lo devolveremos por separado vía atributo)
        self._last_backtest_df = backtest_df

        return SegmentForecastResult(
            segment_id=self.segment_id,
            channel=self.channel,
            brand=self.brand,
            history=history,
            future=future_with_ci,
            residuals_by_h=residuals_by_h,
            metrics=metrics,
        )

    def _extract_future_promos(self, panel: pd.DataFrame) -> dict[pd.Timestamp, int]:
        """
        Si el panel ya trae semanas futuras con Hay_Promocion (extend_promotions_to_future),
        las usa. Si no, vacío y _recursive_forecast usará el último valor.
        """
        # El panel actual solo contiene semanas con venta_real. Las promos futuras
        # están en weekly_features sólo si se extendieron antes de agregar.
        # Como el ETL actual aplica add_promotion_flag sobre el weekly (que solo
        # tiene semanas con dato), las promos futuras no están en el panel.
        # Las cargamos por separado.
        from analytics.data_prep import extend_promotions_to_future, load_promotion_weeks

        promos = load_promotion_weeks()
        promos = extend_promotions_to_future(promos, weeks_ahead=self.horizon + 8)
        if promos.empty:
            return {}

        last_date = pd.Timestamp(panel["semana_inicio"].max())
        future = promos[promos["semana_inicio"] > last_date]
        agg = (
            future.groupby("semana_inicio", as_index=False)["Hay_Promocion"]
            .max()
        )
        return {pd.Timestamp(row["semana_inicio"]).normalize(): int(row["Hay_Promocion"]) for _, row in agg.iterrows()}

    def _apply_bootstrap_ci(
        self,
        preds: pd.DataFrame,
        residuals_by_h: dict[int, list[float]],
    ) -> pd.DataFrame:
        """
        Para cada predicción en horizonte h, calcula IC 80% y 95% como
        pred + quantile(residuos_h, [0.025, 0.1, 0.9, 0.975]).

        Si no hay residuos para un h concreto (poco backtest), interpola
        usando el h más cercano disponible, escalando por sqrt(h) para que
        crezca con el horizonte.
        """
        out = preds.copy()
        # Caso degenerado: backtest no produjo residuos
        if not residuals_by_h:
            for col in ["limite_inferior_80", "limite_superior_80", "limite_inferior_95", "limite_superior_95"]:
                out[col] = out["prediccion"]
            return out

        all_res = np.concatenate([np.asarray(v) for v in residuals_by_h.values()])
        sigma_pool = float(np.std(all_res)) if len(all_res) > 1 else 0.0

        # 1) Para cada horizonte, calcula half-widths quantile usando una ventana
        #    de h vecinos (CI_HORIZON_WINDOW) para suavizar el ruido muestral.
        # 2) Después fuerza monotonía no-decreciente del ancho con horizonte.
        max_h = int(out["horizon_step"].max()) if not out.empty else 0
        # Quantiles asimétricos por horizonte (más ajustado al sesgo real del modelo)
        q_lo_95_h: dict[int, float] = {}
        q_hi_95_h: dict[int, float] = {}
        q_lo_80_h: dict[int, float] = {}
        q_hi_80_h: dict[int, float] = {}

        for h in range(1, max_h + 1):
            pooled: list[float] = []
            for hh in range(max(1, h - CI_HORIZON_WINDOW), h + CI_HORIZON_WINDOW + 1):
                pooled.extend(residuals_by_h.get(hh, []))

            if len(pooled) >= 6:
                arr = np.asarray(pooled)
                q_lo_95_h[h] = float(np.quantile(arr, 0.025))
                q_hi_95_h[h] = float(np.quantile(arr, 0.975))
                q_lo_80_h[h] = float(np.quantile(arr, 0.10))
                q_hi_80_h[h] = float(np.quantile(arr, 0.90))
            else:
                # Fallback gaussiano creciente
                scale = sigma_pool * np.sqrt(h)
                q_lo_95_h[h] = -CONFIDENCE_Z * scale
                q_hi_95_h[h] = CONFIDENCE_Z * scale
                q_lo_80_h[h] = -1.2816 * scale
                q_hi_80_h[h] = 1.2816 * scale

        # Enforce monotonía no-decreciente del ANCHO total con horizonte.
        # Si el ancho h+1 < h, expandir simétricamente para no romper la asimetría.
        def _enforce_width_growth(q_lo: dict[int, float], q_hi: dict[int, float]) -> None:
            prev_width = 0.0
            for h in range(1, max_h + 1):
                width = q_hi[h] - q_lo[h]
                if width < prev_width:
                    delta = (prev_width - width) / 2.0
                    q_lo[h] -= delta
                    q_hi[h] += delta
                prev_width = q_hi[h] - q_lo[h]

        _enforce_width_growth(q_lo_95_h, q_hi_95_h)
        _enforce_width_growth(q_lo_80_h, q_hi_80_h)

        low_80, high_80, low_95, high_95 = [], [], [], []
        for _, row in out.iterrows():
            h = int(row["horizon_step"])
            pred = float(row["prediccion"])
            low_80.append(max(0.0, pred + q_lo_80_h[h]))
            high_80.append(pred + q_hi_80_h[h])
            low_95.append(max(0.0, pred + q_lo_95_h[h]))
            high_95.append(pred + q_hi_95_h[h])

        out["limite_inferior_80"] = np.round(low_80, 2)
        out["limite_superior_80"] = np.round(high_80, 2)
        out["limite_inferior_95"] = np.round(low_95, 2)
        out["limite_superior_95"] = np.round(high_95, 2)
        out["prediccion"] = np.round(out["prediccion"], 2)
        return out

    def _build_history_frame(self, panel: pd.DataFrame) -> pd.DataFrame:
        out = panel.copy().sort_values("semana_inicio")
        records = []
        for _, row in out.iterrows():
            records.append({
                "fecha": pd.Timestamp(row["semana_inicio"]).strftime("%Y-%m-%d"),
                "venta_real": round(float(row[TARGET_VOLUME_COL]), 2),
                "hay_promocion": int(row.get("Hay_Promocion", 0)),
                "impacto_futbol": 0.0,
            })
        return pd.DataFrame(records)

    def _compute_metrics(self, backtest_df: pd.DataFrame) -> dict[str, float]:
        if backtest_df.empty:
            return {"mape": np.nan, "wape": np.nan, "rmse": np.nan, "mape_short": np.nan}

        def _mape(reals: np.ndarray, preds: np.ndarray) -> float:
            mask = reals > 1.0
            if not mask.any():
                return float("nan")
            return float(np.mean(np.abs((reals[mask] - preds[mask]) / reals[mask])) * 100.0)

        reals = backtest_df["real"].values
        preds = backtest_df["prediccion_holdout"].values
        mape = _mape(reals, preds)
        wape = float(np.sum(np.abs(reals - preds)) / np.sum(np.abs(reals)) * 100.0) if np.sum(np.abs(reals)) > 0 else float("nan")
        rmse = float(np.sqrt(mean_squared_error(reals, preds)))

        # MAPE corto plazo (horizon 1-4 semanas), más relevante para producto
        short = backtest_df[backtest_df["horizon_step"] <= 4]
        mape_short = _mape(short["real"].values, short["prediccion_holdout"].values) if not short.empty else float("nan")

        return {
            "mape": round(mape, 2),
            "wape": round(wape, 2),
            "rmse": round(rmse, 2),
            "mape_short": round(mape_short, 2),
        }


# ---------------------------------------------------------------------------
# Multi-segment orchestrator
# ---------------------------------------------------------------------------


@dataclass
class MultiSegmentForecast:
    weekly: pd.DataFrame                   # forecast_weekly (long format)
    monthly: pd.DataFrame                  # forecast_monthly (long format)
    backtest: pd.DataFrame                 # backtest_results
    metrics: dict[str, Any]                # model_metrics.json content
    per_segment_results: dict[str, SegmentForecastResult] = field(default_factory=dict)


class MultiSegmentForecaster:
    """Orquesta SegmentForecaster sobre todos los segmentos definidos en SEGMENTS."""

    def __init__(self, horizon: int = FORECAST_HORIZON_WEEKS) -> None:
        self.horizon = horizon

    def run(self) -> MultiSegmentForecast:
        panels = build_segment_panels()
        if not panels:
            raise RuntimeError("build_segment_panels() devolvió vacío — revisa el ETL")

        weekly_frames: list[pd.DataFrame] = []
        backtest_frames: list[pd.DataFrame] = []
        per_segment_results: dict[str, SegmentForecastResult] = {}
        metrics_by_segment: dict[str, dict[str, float]] = {}

        trained_start: pd.Timestamp | None = None
        trained_end: pd.Timestamp | None = None

        for seg_id, panel in panels.items():
            seg_cfg = next(s for s in SEGMENTS if s["segment_id"] == seg_id)
            fcst = SegmentForecaster(
                segment_id=seg_id,
                channel=seg_cfg["channel"],
                brand=seg_cfg["brand"],
                horizon=self.horizon,
            )
            result = fcst.fit_and_forecast(panel)
            per_segment_results[seg_id] = result
            metrics_by_segment[seg_id] = result.metrics

            if result.history.empty:
                continue

            # Long-format weekly: historical + forecast en mismo schema
            hist_long = result.history.assign(
                segmento=seg_id,
                canal=seg_cfg["channel"],
                marca=seg_cfg["brand"],
                tipo="historico",
                prediccion=np.nan,
                limite_inferior_80=np.nan,
                limite_superior_80=np.nan,
                limite_inferior_95=np.nan,
                limite_superior_95=np.nan,
                modelo="",
            )

            fut = result.future.copy()
            fut_long = pd.DataFrame({
                "fecha": fut["fecha"].dt.strftime("%Y-%m-%d"),
                "segmento": seg_id,
                "canal": seg_cfg["channel"],
                "marca": seg_cfg["brand"],
                "tipo": "forecast",
                "venta_real": np.nan,
                "prediccion": fut["prediccion"],
                "limite_inferior_80": fut["limite_inferior_80"],
                "limite_superior_80": fut["limite_superior_80"],
                "limite_inferior_95": fut["limite_inferior_95"],
                "limite_superior_95": fut["limite_superior_95"],
                "hay_promocion": fut["hay_promocion"],
                "impacto_futbol": 0.0,
                "modelo": MODEL_NAME,
            })

            combined = pd.concat([hist_long, fut_long], ignore_index=True)
            combined = combined[[
                "fecha", "segmento", "canal", "marca", "tipo",
                "venta_real", "prediccion",
                "limite_inferior_80", "limite_superior_80",
                "limite_inferior_95", "limite_superior_95",
                "hay_promocion", "impacto_futbol", "modelo",
            ]]
            weekly_frames.append(combined)

            if hasattr(fcst, "_last_backtest_df") and not fcst._last_backtest_df.empty:
                backtest_frames.append(fcst._last_backtest_df)

            # Rango temporal
            first = pd.Timestamp(panel["semana_inicio"].min())
            last = pd.Timestamp(panel["semana_inicio"].max())
            trained_start = first if trained_start is None or first < trained_start else trained_start
            trained_end = last if trained_end is None or last > trained_end else trained_end

        weekly_all = pd.concat(weekly_frames, ignore_index=True) if weekly_frames else pd.DataFrame()
        backtest_all = pd.concat(backtest_frames, ignore_index=True) if backtest_frames else pd.DataFrame()

        # Agregación mensual (suma de venta_real y prediccion, IC propagados aproximando con suma cuadrática)
        monthly_all = self._aggregate_to_monthly(weekly_all)

        # Métricas globales (full horizon + corto plazo 1-4w)
        if backtest_all.empty:
            global_metrics = {"mape": float("nan"), "wape": float("nan"), "rmse": float("nan"), "mape_short": float("nan")}
        else:
            reals = backtest_all["real"].values
            preds = backtest_all["prediccion_holdout"].values
            mask = reals > 1.0
            short = backtest_all[backtest_all["horizon_step"] <= 4]
            shr, shp = short["real"].values, short["prediccion_holdout"].values
            shmask = shr > 1.0
            global_metrics = {
                "mape": round(float(np.mean(np.abs((reals[mask] - preds[mask]) / reals[mask])) * 100.0), 2) if mask.any() else float("nan"),
                "wape": round(float(np.sum(np.abs(reals - preds)) / np.sum(np.abs(reals)) * 100.0), 2) if np.sum(np.abs(reals)) > 0 else float("nan"),
                "rmse": round(float(np.sqrt(mean_squared_error(reals, preds))), 2),
                "mape_short": round(float(np.mean(np.abs((shr[shmask] - shp[shmask]) / shr[shmask])) * 100.0), 2) if shmask.any() else float("nan"),
            }

        # Frontera train/validation: usamos la última ventana de backtest como validación
        if not backtest_all.empty:
            backtest_dates = pd.to_datetime(backtest_all["fecha"])
            validated_on = f"{backtest_dates.min().strftime('%Y-%m-%d')} to {backtest_dates.max().strftime('%Y-%m-%d')}"
            trained_on = f"{trained_start.strftime('%Y-%m-%d')} to {(backtest_dates.min() - pd.Timedelta(days=1)).strftime('%Y-%m-%d')}"
        else:
            validated_on = "n/a"
            trained_on = f"{trained_start.strftime('%Y-%m-%d')} to {trained_end.strftime('%Y-%m-%d')}" if trained_start else "n/a"

        metrics = {
            "model": MODEL_NAME,
            "horizon_weeks": self.horizon,
            "segments": list(per_segment_results.keys()),
            "metrics_by_segment": {
                k: {kk: (None if (isinstance(vv, float) and np.isnan(vv)) else vv) for kk, vv in v.items()}
                for k, v in metrics_by_segment.items()
            },
            "metrics_global": global_metrics,
            "trained_on": trained_on,
            "validated_on": validated_on,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "limitations": [
                "Promociones históricas (2023-2025): el Trade Plan solo aporta plan 2026; el modelo no ha aprendido el efecto real de promos pasadas.",
                "Impacto_Futbol: feature desactivada hasta tener pesos diferenciados por importancia de partido. Columna se mantiene a 0 por compatibilidad.",
                "Co-packing CMBC excluido del retail forecast (lógica B2B diferente).",
            ],
        }

        return MultiSegmentForecast(
            weekly=weekly_all,
            monthly=monthly_all,
            backtest=backtest_all,
            metrics=metrics,
            per_segment_results=per_segment_results,
        )

    @staticmethod
    def _aggregate_to_monthly(weekly: pd.DataFrame) -> pd.DataFrame:
        if weekly.empty:
            return weekly

        df = weekly.copy()
        df["fecha_dt"] = pd.to_datetime(df["fecha"])
        df["mes"] = df["fecha_dt"].dt.to_period("M").dt.to_timestamp()

        # Sumar valores; los IC se aproximan sumando los anchos al cuadrado (raíz)
        def _agg_ci(series_lo: pd.Series, series_hi: pd.Series, pred_sum: float) -> tuple[float, float]:
            widths = (series_hi - series_lo).dropna().values
            if len(widths) == 0:
                return (float("nan"), float("nan"))
            agg_half_width = float(np.sqrt(np.sum((widths / 2.0) ** 2)))
            return (max(0.0, pred_sum - agg_half_width), pred_sum + agg_half_width)

        records = []
        for (mes, segmento, canal, marca, tipo), group in df.groupby(
            ["mes", "segmento", "canal", "marca", "tipo"], dropna=False
        ):
            real_sum = group["venta_real"].sum(skipna=True) if group["venta_real"].notna().any() else np.nan
            pred_sum = group["prediccion"].sum(skipna=True) if group["prediccion"].notna().any() else np.nan
            promo = int(group["hay_promocion"].max()) if group["hay_promocion"].notna().any() else 0

            if tipo == "forecast" and not np.isnan(pred_sum):
                lo80, hi80 = _agg_ci(group["limite_inferior_80"], group["limite_superior_80"], pred_sum)
                lo95, hi95 = _agg_ci(group["limite_inferior_95"], group["limite_superior_95"], pred_sum)
            else:
                lo80 = hi80 = lo95 = hi95 = np.nan

            records.append({
                "fecha": pd.Timestamp(mes).strftime("%Y-%m-%d"),
                "segmento": segmento,
                "canal": canal,
                "marca": marca,
                "tipo": tipo,
                "venta_real": round(real_sum, 2) if not np.isnan(real_sum) else np.nan,
                "prediccion": round(pred_sum, 2) if not np.isnan(pred_sum) else np.nan,
                "limite_inferior_80": round(lo80, 2) if not np.isnan(lo80) else np.nan,
                "limite_superior_80": round(hi80, 2) if not np.isnan(hi80) else np.nan,
                "limite_inferior_95": round(lo95, 2) if not np.isnan(lo95) else np.nan,
                "limite_superior_95": round(hi95, 2) if not np.isnan(hi95) else np.nan,
                "hay_promocion": promo,
                "impacto_futbol": 0.0,
                "modelo": MODEL_NAME if tipo == "forecast" else "",
            })

        return pd.DataFrame(records).sort_values(["segmento", "fecha"]).reset_index(drop=True)


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------


def export_multi_segment(out: MultiSegmentForecast) -> None:
    """Vuelca los 4 archivos en data/processed/."""
    out.weekly.to_csv(FORECAST_WEEKLY_CSV, index=False)
    out.monthly.to_csv(FORECAST_MONTHLY_CSV, index=False)
    out.backtest.to_csv(BACKTEST_CSV, index=False)
    MODEL_METRICS_JSON.write_text(
        json.dumps(out.metrics, indent=2, ensure_ascii=False, default=_json_default),
        encoding="utf-8",
    )


def _json_default(obj: Any) -> Any:
    if isinstance(obj, (np.floating, np.integer)):
        if isinstance(obj, np.floating) and not np.isfinite(obj):
            return None
        return obj.item()
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    return str(obj)


# ---------------------------------------------------------------------------
# Backward compatibility — WeeklyVolumeForecaster (API antigua)
# ---------------------------------------------------------------------------


@dataclass
class ForecastResult:
    """Esquema legacy usado por backend/app/services/forecast.py."""
    history: pd.DataFrame
    future: pd.DataFrame
    metrics: dict[str, float]

    @property
    def export_frame(self) -> pd.DataFrame:
        hist = self.history.copy()
        hist["tipo"] = hist["prediccion_futura"].apply(
            lambda v: "historico_validacion" if pd.notna(v) else "historico"
        )
        fut = self.future.copy()
        fut["tipo"] = "forecast"
        combined = pd.concat([hist, fut], ignore_index=True)
        return combined[[
            "fecha", "tipo", "venta_real_historica", "prediccion_futura",
            "limite_inferior", "limite_superior", "Hay_Promocion", "Impacto_Futbol",
        ]]


class WeeklyVolumeForecaster:
    """
    Wrapper compat: entrena sobre el segmento 'total_uk_retail' del nuevo motor
    y expone el formato legacy que espera el backend (history + future con
    columnas en CamelCase antiguas). Internamente usa SegmentForecaster con
    bootstrap IC, así que los problemas 3 y 4 quedan resueltos también aquí.
    """

    def __init__(self, horizon: int = FORECAST_HORIZON_WEEKS) -> None:
        self.horizon = horizon
        self._inner: SegmentForecaster | None = None
        self._weekly: pd.DataFrame | None = None
        self._cached_residuals: dict[int, list[float]] = {}

    def fit(self, weekly: pd.DataFrame) -> ForecastResult:
        self._weekly = weekly.copy()
        self._inner = SegmentForecaster(
            segment_id="total_uk_retail",
            channel="ALL",
            brand="ALL",
            horizon=self.horizon,
        )
        result = self._inner.fit_and_forecast(weekly)
        # Cache residuals so predict_future doesn't re-run the backtest
        self._cached_residuals = result.residuals_by_h

        # Adapt schema legacy
        hist_legacy = pd.DataFrame({
            "fecha": result.history["fecha"],
            "venta_real_historica": result.history["venta_real"],
            "prediccion_futura": np.nan,
            "limite_inferior": np.nan,
            "limite_superior": np.nan,
            "Hay_Promocion": result.history["hay_promocion"],
            "Impacto_Futbol": 0.0,
        })

        fut_legacy = pd.DataFrame({
            "fecha": result.future["fecha"].dt.strftime("%Y-%m-%d") if not result.future.empty else [],
            "venta_real_historica": np.nan,
            "prediccion_futura": result.future["prediccion"] if not result.future.empty else [],
            "limite_inferior": result.future["limite_inferior_95"] if not result.future.empty else [],
            "limite_superior": result.future["limite_superior_95"] if not result.future.empty else [],
            "Hay_Promocion": result.future["hay_promocion"] if not result.future.empty else [],
            "Impacto_Futbol": 0.0,
        })

        return ForecastResult(
            history=hist_legacy,
            future=fut_legacy,
            metrics={
                "mae_holdout_hl": result.metrics.get("rmse", float("nan")),
                "mape_holdout_pct": result.metrics.get("mape", float("nan")),
                "wape_holdout_pct": result.metrics.get("wape", float("nan")),
            },
        )

    def predict_future(
        self,
        *,
        steps: int | None = None,
        hay_promocion: int | None = None,
        impacto_futbol: float | None = None,  # ignorado por compat
    ) -> pd.DataFrame:
        if self._inner is None or self._inner._final_model is None or self._weekly is None:
            raise RuntimeError("El modelo no está entrenado. Llama a fit() primero.")
        n = steps or self.horizon
        data = _add_lag_features(self._weekly)
        seed = data.tail(12)[["semana_inicio", "semana_idx", TARGET_VOLUME_COL, "Hay_Promocion", "num_retailers_en_promo"]].copy()

        promos_future = None
        if hay_promocion is not None:
            promos_future = {}
            last_date = seed["semana_inicio"].iloc[-1]
            for step in range(1, n + 1):
                promos_future[(last_date + pd.Timedelta(days=7 * step)).normalize()] = int(hay_promocion)

        clim = _compute_clim_weather(self._weekly) if self._weekly is not None else {}
        preds = self._inner._recursive_forecast(
            self._inner._final_model, seed, n_steps=n,
            promos_future=promos_future, clim_weather=clim,
        )
        ci = self._inner._apply_bootstrap_ci(preds, self._inner_residuals())

        return pd.DataFrame({
            "fecha": ci["fecha"].dt.strftime("%Y-%m-%d"),
            "venta_real_historica": np.nan,
            "prediccion_futura": ci["prediccion"],
            "limite_inferior": ci["limite_inferior_95"],
            "limite_superior": ci["limite_superior_95"],
            "Hay_Promocion": ci["hay_promocion"],
            "Impacto_Futbol": 0.0,
        })

    def _inner_residuals(self) -> dict[int, list[float]]:
        # Return residuals cached during fit() — avoids re-running the backtest
        return self._cached_residuals


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
    """Export legacy a public/forecast_results.{csv,json} (consumido por frontend)."""
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
    """Pipeline legacy: solo total UK + export a public/."""
    weekly = run_etl()
    model = WeeklyVolumeForecaster()
    result = model.fit(weekly)
    export_results(result, FORECAST_JSON, FORECAST_CSV)
    return result


def run_multi_segment_pipeline(horizon: int = FORECAST_HORIZON_WEEKS) -> MultiSegmentForecast:
    """Pipeline nueva: entrena los 4 segmentos + total y vuelca los 4 archivos."""
    runner = MultiSegmentForecaster(horizon=horizon)
    out = runner.run()
    export_multi_segment(out)
    return out


if __name__ == "__main__":
    # Por defecto ejecuta la pipeline completa nueva
    multi = run_multi_segment_pipeline()
    print("Segmentos entrenados:", list(multi.per_segment_results.keys()))
    print("Metrics globales:", multi.metrics["metrics_global"])
    print(f"OK -> {FORECAST_WEEKLY_CSV}")
    print(f"    {FORECAST_MONTHLY_CSV}")
    print(f"    {BACKTEST_CSV}")
    print(f"    {MODEL_METRICS_JSON}")
