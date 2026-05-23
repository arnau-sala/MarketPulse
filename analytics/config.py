"""Rutas y constantes del pipeline MarketPulse UK."""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"
OUTPUT_DIR = PROJECT_ROOT / "public"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Fuentes principales (Excel del reto; CSV si se exportan)
UK_DATA_XLSX = DATA_DIR / "UK DATA.xlsx"
PROMOTIONS_XLSX = DATA_DIR / "Damm Trade Plan - promotions.xlsx"
FOOTBALL_CSV = DATA_DIR / "Partidos_Reales_UK_Completo_2026.csv"

# Clima: cache de Open-Meteo (se crea automáticamente en el primer run)
UK_WEATHER_CSV = DATA_DIR / "uk_weather_weekly.csv"
WEATHER_CSV  = DATA_DIR / "UK_Clima_Semanal.csv"

# Legacy outputs (frontend lee de public/)
FORECAST_JSON = OUTPUT_DIR / "forecast_results.json"
FORECAST_CSV = OUTPUT_DIR / "forecast_results.csv"
WEEKLY_FEATURES_CSV = DATA_DIR / "weekly_features.csv"

# Nuevos outputs segmentados (data/processed/)
FORECAST_WEEKLY_CSV = PROCESSED_DIR / "forecast_weekly.csv"
FORECAST_MONTHLY_CSV = PROCESSED_DIR / "forecast_monthly.csv"
BACKTEST_CSV = PROCESSED_DIR / "backtest_results.csv"
MODEL_METRICS_JSON = PROCESSED_DIR / "model_metrics.json"

# Columnas de negocio
TARGET_VOLUME_COL = "Hl"
TARGET_REVENUE_COL = "Venta Neta"

# Forecast
FORECAST_HORIZON_WEEKS = 26  # ~6 meses
CONFIDENCE_Z = 1.96

# Walk-forward backtest: cuántos orígenes (más = IC más estables)
BACKTEST_ORIGINS = 24      # ~1 origen cada 2 semanas en el último año
BACKTEST_STEP_WEEKS = 2    # separación entre orígenes
# Smoothing del IC: ventana de horizontes vecinos a juntar para los quantiles
CI_HORIZON_WINDOW = 3      # h -> usa residuos de [h-3, h+3]

# Segmentos a entrenar (mínimo viable: 2 canales x 2 marcas top + total).
# NOTA: el prompt original menciona Voll-Damm, pero en UK DATA.xlsx esa marca
#   no existe. Las marcas Damm UK realmente presentes son Estrella Damm,
#   Victoria, Free Damm, Daura, Damm Lemon, Inedit. Usamos las dos top por
#   volumen como segmentos representativos: Estrella Damm y Victoria.
# Cada segmento define:
#   - channel_filter: substring case-insensitive contra "Sales Channel"
#   - brand_pattern: regex case-insensitive contra Business Brands + Marca
SEGMENTS: list[dict] = [
    {
        "segment_id": "off_trade_estrella_damm",
        "channel": "OFF_TRADE",
        "brand": "Estrella Damm",
        "channel_filter": "OFF TRADE",
        # Coincide con "ESTRELLA DAMM" pero NO con "ESTRELLA NON-ALCOHOLIC" ni "DAURA"
        "brand_pattern": r"\bestrella\s+damm\b",
    },
    {
        "segment_id": "off_trade_victoria",
        "channel": "OFF_TRADE",
        "brand": "Victoria",
        "channel_filter": "OFF TRADE",
        "brand_pattern": r"\bvictoria\b",
    },
    {
        "segment_id": "on_trade_estrella_damm",
        "channel": "ON_TRADE",
        "brand": "Estrella Damm",
        "channel_filter": "ON TRADE",
        "brand_pattern": r"\bestrella\s+damm\b",
    },
    {
        "segment_id": "on_trade_victoria",
        "channel": "ON_TRADE",
        "brand": "Victoria",
        "channel_filter": "ON TRADE",
        "brand_pattern": r"\bvictoria\b",
    },
    {
        # Segmento agregado total retail UK (sin CMBC co-packing, sin filtro marca)
        "segment_id": "total_uk_retail",
        "channel": "ALL",
        "brand": "ALL",
        "channel_filter": None,
        "brand_pattern": None,
    },
]

# Filtros de calidad
MIN_VOLUME_HL = 0.0
MAX_VOLUME_HL_QUANTILE = 0.995
MIN_REVENUE = 0.0

# Marcas Damm UK (filtro opcional en ETL)
DAMM_BRAND_KEYWORDS = ("Damm", "Estrella", "Voll", "Daura", "Inedit")
