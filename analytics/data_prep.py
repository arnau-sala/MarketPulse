"""
ETL y feature engineering para MarketPulse UK.

Carga ventas, catálogo y clientes; agrega a semanas (lunes–domingo);
añade promociones y calendario deportivo.
"""

from __future__ import annotations

import re
import warnings
from datetime import date, timedelta
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd

from analytics.config import (
    DAMM_BRAND_KEYWORDS,
    DATA_DIR,
    FOOTBALL_CSV,
    MAX_VOLUME_HL_QUANTILE,
    MIN_REVENUE,
    MIN_VOLUME_HL,
    PROMOTIONS_XLSX,
    TARGET_REVENUE_COL,
    TARGET_VOLUME_COL,
    UK_DATA_XLSX,
    WEEKLY_FEATURES_CSV,
)

warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")

MONTH_MAP: dict[str, int] = {
    "Ene": 1,
    "Feb": 2,
    "Mar": 3,
    "Abr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Ago": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dic": 12,
}

RETAILER_CHANNEL_MAP: dict[str, str] = {
    "tesco": "Tesco",
    "sainsbury": "Sainsbury's",
    "waitrose": "Waitrose",
    "morrisons": "Morrisons",
    "asda": "Asda",
}


# ---------------------------------------------------------------------------
# Carga de fuentes
# ---------------------------------------------------------------------------


def _read_excel_sheet(path: Path, sheet: str) -> pd.DataFrame:
    return pd.read_excel(path, sheet_name=sheet, engine="openpyxl")


def load_raw_tables(data_dir: Path | None = None) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Carga DATABASE, MaterialData y CUSTOMERS desde UK DATA.xlsx
    o desde CSVs homónimos en data/ si existen.
    """
    base = data_dir or DATA_DIR

    csv_db = base / "DATABASE.csv"
    csv_mat = base / "MaterialData.csv"
    csv_cust = base / "CUSTOMERS.csv"

    if csv_db.exists() and csv_mat.exists() and csv_cust.exists():
        sales = pd.read_csv(csv_db)
        materials = pd.read_csv(csv_mat)
        customers = pd.read_csv(csv_cust)
        return sales, materials, customers

    xlsx = base / "UK DATA.xlsx"
    if not xlsx.exists():
        xlsx = UK_DATA_XLSX
    if not xlsx.exists():
        raise FileNotFoundError(f"No se encontró UK DATA.xlsx ni CSVs en {base}")

    sales = _read_excel_sheet(xlsx, "DATABASE")
    materials = _read_excel_sheet(xlsx, "MaterialData")
    customers = _read_excel_sheet(xlsx, "CUSTOMERS")
    return sales, materials, customers


def extract_material_code(value: object) -> str | None:
    if pd.isna(value):
        return None
    match = re.match(r"^([A-Z0-9]+)", str(value).strip())
    return match.group(1) if match else str(value).strip()


def extract_customer_code(value: object) -> int | None:
    if pd.isna(value):
        return None
    first_token = str(value).split()[0]
    numbers = re.findall(r"\d+", first_token)
    return int(numbers[-1]) if numbers else None


def parse_calendar_month(value: object) -> pd.Timestamp | pd.NaT:
    """Convierte 'Abr.25' → primer día del mes."""
    if pd.isna(value):
        return pd.NaT
    text = str(value).strip()
    match = re.match(r"([A-Za-z]{3})\.(\d{2})", text)
    if not match:
        return pd.NaT
    month_abbr, year_suffix = match.group(1), match.group(2)
    month = MONTH_MAP.get(month_abbr.capitalize()[:3])
    if month is None:
        return pd.NaT
    year = 2000 + int(year_suffix)
    return pd.Timestamp(year=year, month=month, day=1)


# ---------------------------------------------------------------------------
# Merge y limpieza
# ---------------------------------------------------------------------------


def _calendar_column(sales: pd.DataFrame) -> str:
    for col in sales.columns:
        if "CALENDARIO" in str(col).upper():
            return col
    raise KeyError("No se encontró columna de periodo (AÑO CALENDARIO) en DATABASE")


def merge_dimensions(
    sales: pd.DataFrame,
    materials: pd.DataFrame,
    customers: pd.DataFrame,
    *,
    uk_only: bool = True,
    damm_brands_only: bool = False,
) -> pd.DataFrame:
    """Une ventas con material y cliente; añade fecha mensual."""
    df = sales.copy()
    df["Cod. Material"] = df["Cod. Material"].map(extract_material_code)
    df["Cod. Cliente"] = df["Cod. Cliente"].map(extract_customer_code)
    df["fecha_mes"] = df[_calendar_column(sales)].map(parse_calendar_month)

    mat = materials.rename(columns=str.strip).copy()
    mat["Cod. Material"] = mat["Cod. Material"].astype(str).str.strip()

    cust = customers.copy()
    cust["Cod. Cliente"] = cust["Cod. Cliente"].astype(int)

    df = df.merge(
        mat[
            [
                "Cod. Material",
                "Marca",
                "Business Brands",
                "PACK TYPE",
                "PACK SIZE",
                "Línea Negocio",
            ]
        ],
        on="Cod. Material",
        how="left",
    )
    df = df.merge(
        cust[
            [
                "Cod. Cliente",
                "Agrupacion",
                "Sales Channel",
                "SubChannel",
                "Pais",
            ]
        ],
        on="Cod. Cliente",
        how="left",
    )

    if uk_only:
        df = df[df["Pais"].astype(str).str.contains("Reino Unido", case=False, na=False)]

    if damm_brands_only:
        pattern = "|".join(DAMM_BRAND_KEYWORDS)
        brand_col = df["Business Brands"].fillna("") + df["Marca"].fillna("")
        df = df[brand_col.str.contains(pattern, case=False, na=False)]

    return df


def clean_anomalies(df: pd.DataFrame) -> pd.DataFrame:
    """Elimina nulos críticos y recorta outliers extremos en volumen e ingresos."""
    out = df.dropna(subset=["fecha_mes", TARGET_VOLUME_COL]).copy()

    out = out[out[TARGET_VOLUME_COL] >= MIN_VOLUME_HL]
    out = out[out[TARGET_REVENUE_COL].fillna(0) >= MIN_REVENUE]

    vol_cap = out[TARGET_VOLUME_COL].quantile(MAX_VOLUME_HL_QUANTILE)
    out = out[out[TARGET_VOLUME_COL] <= vol_cap]

    out = out.replace([np.inf, -np.inf], np.nan).dropna(
        subset=[TARGET_VOLUME_COL, "fecha_mes"]
    )
    return out


# ---------------------------------------------------------------------------
# Agregación semanal
# ---------------------------------------------------------------------------


def month_start_to_week_start(ts: pd.Timestamp) -> pd.Timestamp:
    """Lunes de la semana ISO que contiene el día 1 del mes."""
    return ts - pd.Timedelta(days=ts.weekday())


def expand_monthly_to_weekly(daily_like: pd.DataFrame) -> pd.DataFrame:
    """
    Reparte volumen/ingreso mensual de forma uniforme entre semanas del mes.
    Entrada: filas con fecha_mes y métricas agregables.
    """
    rows: list[dict[str, object]] = []
    for _, row in daily_like.iterrows():
        month_start: pd.Timestamp = row["fecha_mes"]
        period_end = month_start + pd.offsets.MonthEnd(0)
        weeks = pd.date_range(
            month_start_to_week_start(month_start),
            month_start_to_week_start(period_end),
            freq="W-MON",
        )
        if len(weeks) == 0:
            weeks = pd.DatetimeIndex([month_start_to_week_start(month_start)])
        n_weeks = len(weeks)
        base = {c: row[c] for c in row.index if c != "fecha_mes"}
        for week_start in weeks:
            record = dict(base)
            record["semana_inicio"] = week_start.normalize()
            record[TARGET_VOLUME_COL] = row[TARGET_VOLUME_COL] / n_weeks
            record[TARGET_REVENUE_COL] = row.get(TARGET_REVENUE_COL, 0) / n_weeks
            rows.append(record)
    return pd.DataFrame(rows)


def aggregate_weekly(df: pd.DataFrame) -> pd.DataFrame:
    """Agrega a nivel semanal (lunes) sumando volumen e ingresos."""
    monthly = (
        df.groupby("fecha_mes", as_index=False)
        .agg(
            {
                TARGET_VOLUME_COL: "sum",
                TARGET_REVENUE_COL: "sum",
            }
        )
    )
    weekly = expand_monthly_to_weekly(monthly)
    weekly = (
        weekly.groupby("semana_inicio", as_index=False)
        .agg({TARGET_VOLUME_COL: "sum", TARGET_REVENUE_COL: "sum"})
        .sort_values("semana_inicio")
        .reset_index(drop=True)
    )
    weekly["semana_fin"] = weekly["semana_inicio"] + pd.Timedelta(days=6)
    return weekly


# ---------------------------------------------------------------------------
# Promociones
# ---------------------------------------------------------------------------


def _parse_event_date_ranges(header: str) -> list[tuple[date, date]]:
    """Extrae rangos dd/mm del texto de cabecera de evento."""
    ranges: list[tuple[date, date]] = []
    if not isinstance(header, str) or not header.strip():
        return ranges
    year = 2026
    patterns = [
        r"(\d{1,2})/(\d{1,2})\s*-\s*(\d{1,2})/(\d{1,2})",
        r"(\d{2})/(\d{2})-(\d{2})/(\d{2})",
    ]
    for pattern in patterns:
        for m in re.finditer(pattern, header):
            d1, m1, d2, m2 = (int(x) for x in m.groups())
            start = date(year, m1, d1)
            end = date(year, m2, d2)
            if end < start:
                end = date(year + 1, m2, d2)
            ranges.append((start, end))
    return ranges


def _weeks_in_range(start: date, end: date) -> list[pd.Timestamp]:
    weeks: list[pd.Timestamp] = []
    cursor = pd.Timestamp(start) - pd.Timedelta(days=pd.Timestamp(start).weekday())
    end_ts = pd.Timestamp(end)
    while cursor <= end_ts:
        weeks.append(cursor.normalize())
        cursor += pd.Timedelta(days=7)
    return weeks


def _promo_weeks_from_headers(headers: Iterable[object]) -> set[pd.Timestamp]:
    promo_weeks: set[pd.Timestamp] = set()
    for header in headers:
        for start, end in _parse_event_date_ranges(str(header)):
            promo_weeks.update(_weeks_in_range(start, end))
    return promo_weeks


def _promo_weeks_from_date_row(row: pd.Series) -> set[pd.Timestamp]:
    weeks: set[pd.Timestamp] = set()
    for val in row:
        if isinstance(val, (pd.Timestamp, np.datetime64)):
            ts = pd.Timestamp(val).normalize()
            weeks.add(ts - pd.Timedelta(days=ts.weekday()))
        elif isinstance(val, str):
            parsed = pd.to_datetime(val, dayfirst=True, errors="coerce")
            if pd.notna(parsed):
                ts = parsed.normalize()
                weeks.add(ts - pd.Timedelta(days=ts.weekday()))
    return weeks


def _sheet_has_promo_cell(value: object) -> bool:
    if pd.isna(value):
        return False
    text = str(value).strip().lower()
    if text in {"", "nan", "0"}:
        return False
    if text.replace(".", "", 1).isdigit():
        return False
    return True


def load_promotion_weeks(path: Path | None = None) -> pd.DataFrame:
    """
    Devuelve DataFrame con semana_inicio, retailer, Hay_Promocion=1.
    Combina cabeceras de eventos y celdas marcadas en hojas de retailers.
    """
    promo_path = path or PROMOTIONS_XLSX
    if not promo_path.exists():
        return pd.DataFrame(columns=["semana_inicio", "retailer", "Hay_Promocion"])

    records: list[dict[str, object]] = []
    xls = pd.ExcelFile(promo_path, engine="openpyxl")

    for sheet in xls.sheet_names:
        retailer = RETAILER_CHANNEL_MAP.get(sheet.strip().lower(), sheet.strip())
        raw = pd.read_excel(xls, sheet_name=sheet, header=None)
        promo_weeks: set[pd.Timestamp] = set()

        # Rangos en cabeceras (Tesco, Sainsbury's)
        if raw.shape[0] > 0:
            promo_weeks |= _promo_weeks_from_headers(raw.iloc[0].tolist())

        # Filas con fechas de inicio de semana (Waitrose, Morrisons, Tesco fila ~3)
        for idx in range(min(6, len(raw))):
            row = raw.iloc[idx]
            if row.apply(lambda v: isinstance(v, (pd.Timestamp, np.datetime64))).any():
                promo_weeks |= _promo_weeks_from_date_row(row)

        # Celdas con texto de promo (MTB, LAUNCH, precios, etc.)
        for idx in range(4, len(raw)):
            row = raw.iloc[idx]
            date_candidates = [
                c for c in row.index if isinstance(row[c], (pd.Timestamp, np.datetime64))
            ]
            if date_candidates:
                for col in date_candidates:
                    if _sheet_has_promo_cell(row[col]):
                        ts = pd.Timestamp(row[col]).normalize()
                        promo_weeks.add(ts - pd.Timedelta(days=ts.weekday()))

        for week in promo_weeks:
            records.append(
                {"semana_inicio": week, "retailer": retailer, "Hay_Promocion": 1}
            )

    if not records:
        return pd.DataFrame(columns=["semana_inicio", "retailer", "Hay_Promocion"])

    promo_df = pd.DataFrame(records).drop_duplicates()
    return promo_df


def add_promotion_flag(weekly: pd.DataFrame, promo_df: pd.DataFrame) -> pd.DataFrame:
    out = weekly.copy()
    if promo_df.empty:
        out["Hay_Promocion"] = 0
        out["num_retailers_en_promo"] = 0
        return out

    agg = (
        promo_df.groupby("semana_inicio", as_index=False)
        .agg(Hay_Promocion=("Hay_Promocion", "max"), num_retailers_en_promo=("retailer", "nunique"))
    )
    out = out.merge(agg, on="semana_inicio", how="left")
    out["Hay_Promocion"] = out["Hay_Promocion"].fillna(0).astype(int)
    out["num_retailers_en_promo"] = out["num_retailers_en_promo"].fillna(0).astype(int)
    return out


# ---------------------------------------------------------------------------
# Fútbol
# ---------------------------------------------------------------------------


def load_football_impact(path: Path | None = None) -> pd.DataFrame:
    csv_path = path or FOOTBALL_CSV
    if not csv_path.exists():
        return pd.DataFrame(columns=["semana_inicio", "Impacto_Futbol"])

    matches = pd.read_csv(csv_path, parse_dates=["Date"])
    matches["semana_inicio"] = matches["Date"].apply(
        lambda d: pd.Timestamp(d) - pd.Timedelta(days=pd.Timestamp(d).weekday())
    )
    weekly_football = (
        matches.groupby("semana_inicio", as_index=False)["Expected_Impact_Score"]
        .sum()
        .rename(columns={"Expected_Impact_Score": "Impacto_Futbol"})
    )
    return weekly_football


def add_football_impact(weekly: pd.DataFrame, football: pd.DataFrame) -> pd.DataFrame:
    out = weekly.copy()
    if football.empty:
        out["Impacto_Futbol"] = 0.0
        return out
    out = out.merge(football, on="semana_inicio", how="left")
    out["Impacto_Futbol"] = out["Impacto_Futbol"].fillna(0.0)
    return out


def build_time_features(weekly: pd.DataFrame) -> pd.DataFrame:
    out = weekly.copy()
    out["anio"] = out["semana_inicio"].dt.year
    out["mes"] = out["semana_inicio"].dt.month
    out["semana_anio"] = out["semana_inicio"].dt.isocalendar().week.astype(int)
    out["semana_idx"] = np.arange(len(out))
    return out


def run_etl(
    *,
    uk_only: bool = True,
    damm_brands_only: bool = False,
    save_weekly: bool = True,
) -> pd.DataFrame:
    """Pipeline ETL completo → DataFrame semanal listo para modelar."""
    sales, materials, customers = load_raw_tables()
    merged = merge_dimensions(
        sales, materials, customers, uk_only=uk_only, damm_brands_only=damm_brands_only
    )
    cleaned = clean_anomalies(merged)
    weekly = aggregate_weekly(cleaned)
    promos = load_promotion_weeks()
    weekly = add_promotion_flag(weekly, promos)
    football = load_football_impact()
    weekly = add_football_impact(weekly, football)
    weekly = build_time_features(weekly)

    if save_weekly:
        weekly.to_csv(WEEKLY_FEATURES_CSV, index=False)

    return weekly


if __name__ == "__main__":
    df = run_etl()
    print(f"Semanas preparadas: {len(df)}")
    print(df.tail(8).to_string())
