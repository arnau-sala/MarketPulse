"""Rutas y constantes del pipeline MarketPulse UK."""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_DIR = PROJECT_ROOT / "public"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Fuentes principales (Excel del reto; CSV si se exportan)
UK_DATA_XLSX = DATA_DIR / "UK DATA.xlsx"
PROMOTIONS_XLSX = DATA_DIR / "Damm Trade Plan - promotions.xlsx"
FOOTBALL_CSV = DATA_DIR / "Partidos_Reales_UK_Completo_2026.csv"

FORECAST_JSON = OUTPUT_DIR / "forecast_results.json"
FORECAST_CSV = OUTPUT_DIR / "forecast_results.csv"
WEEKLY_FEATURES_CSV = DATA_DIR / "weekly_features.csv"

# Columnas de negocio
TARGET_VOLUME_COL = "Hl"
TARGET_REVENUE_COL = "Venta Neta"

# Forecast
FORECAST_HORIZON_WEEKS = 8
CONFIDENCE_Z = 1.96

# Filtros de calidad
MIN_VOLUME_HL = 0.0
MAX_VOLUME_HL_QUANTILE = 0.995
MIN_REVENUE = 0.0

# Marcas Damm UK (filtro opcional en ETL)
DAMM_BRAND_KEYWORDS = ("Damm", "Estrella", "Voll", "Daura", "Inedit")
