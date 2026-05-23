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
    FORECAST_HORIZON_WEEKS,
    MAX_VOLUME_HL_QUANTILE,
    MIN_REVENUE,
    MIN_VOLUME_HL,
    PROMOTIONS_XLSX,
    SEGMENTS,
    TARGET_REVENUE_COL,
    TARGET_VOLUME_COL,
    UK_DATA_XLSX,
    WEEKLY_FEATURES_CSV,
)

# NOTA — Limitación conocida sobre promociones históricas:
#   El Trade Plan del Excel solo contiene el plan promocional de 2026.
#   Esto significa que el histórico (2023-2025) tiene Hay_Promocion=0 en
#   casi todas las semanas y el modelo no aprende el efecto real de la
#   promo. Una heurística posible sería derivar promos pasadas desde caídas
#   anómalas de precio (>15% sobre rolling 8 semanas), pero NO se implementa
#   aquí porque no podemos validarla sin ground truth. Se documenta como
#   limitación del modelo en model_metrics.json.

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


def extend_promotions_to_future(
    promo_df: pd.DataFrame,
    weeks_ahead: int = 16,
) -> pd.DataFrame:
    """
    Replicates the historical promotion pattern into future weeks.

    Strategy: for each (ISO week number, retailer) pair found in the historical
    promo data, generate entries for the same ISO week in future years until
    the forecast horizon is covered.

    This ensures that if Tesco ran a promotion in week 21 of 2025, the model
    will also expect a promotion in week 21 of 2026 and beyond.

    Args:
        promo_df: output of load_promotion_weeks().
        weeks_ahead: how many weeks beyond today to extend.

    Returns:
        Extended DataFrame with the same schema as promo_df.
    """
    if promo_df.empty:
        return promo_df

    promo_df = promo_df.copy()
    promo_df["semana_inicio"] = pd.to_datetime(promo_df["semana_inicio"])

    latest_promo = promo_df["semana_inicio"].max()
    horizon_end = pd.Timestamp.now().normalize() + pd.Timedelta(weeks=weeks_ahead)

    if latest_promo >= horizon_end:
        return promo_df

    # Index historical promos by ISO week number
    promo_df["iso_week"] = promo_df["semana_inicio"].apply(
        lambda ts: int(pd.Timestamp(ts).isocalendar().week)
    )

    # Generate all Monday-aligned future weeks not yet covered
    future_weeks = pd.date_range(
        start=latest_promo + pd.Timedelta(weeks=1),
        end=horizon_end,
        freq="W-MON",
    )

    extended: list[dict] = []
    for future_week in future_weeks:
        fw_iso = int(future_week.isocalendar().week)
        matches = promo_df[promo_df["iso_week"] == fw_iso]
        for _, row in matches.drop_duplicates(subset=["retailer"]).iterrows():
            extended.append(
                {
                    "semana_inicio": future_week.normalize(),
                    "retailer": row["retailer"],
                    "Hay_Promocion": 1,
                }
            )

    if not extended:
        return promo_df[["semana_inicio", "retailer", "Hay_Promocion"]]

    extended_df = pd.DataFrame(extended)
    combined = pd.concat(
        [promo_df[["semana_inicio", "retailer", "Hay_Promocion"]], extended_df],
        ignore_index=True,
    ).drop_duplicates(subset=["semana_inicio", "retailer"])

    return combined


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


# ---------------------------------------------------------------------------
# Bank Holidays (England & Wales)
# ---------------------------------------------------------------------------

# Static list 2023-2027 — fácil de extender añadiendo fechas al final.
_UK_BANK_HOLIDAYS: frozenset[str] = frozenset([
    # 2023
    "2023-01-02", "2023-04-07", "2023-04-10", "2023-05-01",
    "2023-05-08",  # Coronación Carlos III
    "2023-05-29", "2023-08-28", "2023-12-25", "2023-12-26",
    # 2024
    "2024-01-01", "2024-03-29", "2024-04-01", "2024-05-06",
    "2024-05-27", "2024-08-26", "2024-12-25", "2024-12-26",
    # 2025
    "2025-01-01", "2025-04-18", "2025-04-21", "2025-05-05",
    "2025-05-26", "2025-08-25", "2025-12-25", "2025-12-26",
    # 2026
    "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04",
    "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
    # 2027 (para cubrir el horizonte de forecast)
    "2027-01-01", "2027-04-02", "2027-04-05", "2027-05-03",
    "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
])


def count_bank_holidays_in_week(week_start: pd.Timestamp) -> int:
    """Cuenta los bank holidays de England & Wales en la semana [lunes, domingo]."""
    count = 0
    for offset in range(7):
        if (week_start + pd.Timedelta(days=offset)).strftime("%Y-%m-%d") in _UK_BANK_HOLIDAYS:
            count += 1
    return count


def add_bank_holiday_features(weekly: pd.DataFrame) -> pd.DataFrame:
    """Añade n_bank_holidays al panel semanal."""
    out = weekly.copy()
    out["n_bank_holidays"] = out["semana_inicio"].apply(
        lambda ts: count_bank_holidays_in_week(pd.Timestamp(ts).normalize())
    )
    return out


# ---------------------------------------------------------------------------
# Clima — Open-Meteo (London como proxy UK)
# ---------------------------------------------------------------------------

# Temperaturas medias mensuales de Londres (°C) — fallback si la API no está disponible
_CLIM_TEMP_BY_MONTH: dict[int, float] = {
    1: 4.0, 2: 4.5, 3: 7.0, 4: 9.5, 5: 12.5, 6: 16.0,
    7: 18.5, 8: 18.0, 9: 15.0, 10: 11.0, 11: 7.0, 12: 5.0,
}
# Horas de sol semanales medias (horas/día × 7)
_CLIM_SUN_BY_MONTH: dict[int, float] = {
    1: 10.5, 2: 17.5, 3: 26.6, 4: 36.4, 5: 44.8, 6: 50.4,
    7: 49.0, 8: 44.8, 9: 35.0, 10: 23.8, 11: 14.0, 12: 9.1,
}


def load_weather_features(
    weekly: pd.DataFrame,
    cache_path: Path | None = None,
) -> pd.DataFrame:
    """
    Añade temp_media_semana y horas_sol_semana al panel semanal.

    Fuente primaria: medias climatológicas mensuales de Londres (sin dependencia
    de API externa). Si en el futuro se dispone de datos reales, basta con
    colocar un CSV con columnas [semana_inicio, temp_media_semana, horas_sol_semana]
    en data/uk_weather_weekly.csv y se usará automáticamente.
    """
    from analytics.config import UK_WEATHER_CSV

    csv_path = cache_path or UK_WEATHER_CSV
    out = weekly.copy()

    # Usar CSV si existe (datos reales descargados previamente)
    if csv_path.exists():
        try:
            weather_weekly = pd.read_csv(csv_path, parse_dates=["semana_inicio"])
            weather_weekly["semana_inicio"] = pd.to_datetime(weather_weekly["semana_inicio"])
            out = out.merge(
                weather_weekly[["semana_inicio", "temp_media_semana", "horas_sol_semana"]],
                on="semana_inicio",
                how="left",
            )
        except Exception:
            out["temp_media_semana"] = np.nan
            out["horas_sol_semana"] = np.nan
    else:
        out["temp_media_semana"] = np.nan
        out["horas_sol_semana"] = np.nan

    # Rellenar huecos (o todo si no hay CSV) con climatología mensual
    months = out["semana_inicio"].dt.month
    out["temp_media_semana"] = out["temp_media_semana"].where(
        out["temp_media_semana"].notna(),
        months.map(_CLIM_TEMP_BY_MONTH),
    )
    out["horas_sol_semana"] = out["horas_sol_semana"].where(
        out["horas_sol_semana"].notna(),
        months.map(_CLIM_SUN_BY_MONTH),
    )

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
    promos = extend_promotions_to_future(promos, weeks_ahead=FORECAST_HORIZON_WEEKS + 8)
    weekly = add_promotion_flag(weekly, promos)
    football = load_football_impact()
    weekly = add_football_impact(weekly, football)
    weekly = build_time_features(weekly)
    weekly = add_bank_holiday_features(weekly)       # NEW — festivos UK
    weekly = load_weather_features(weekly)           # NEW — temperatura y sol

    if save_weekly:
        weekly.to_csv(WEEKLY_FEATURES_CSV, index=False)

    return weekly


# ---------------------------------------------------------------------------
# Segmentación canal × marca
# ---------------------------------------------------------------------------


def _filter_segment_rows(
    merged: pd.DataFrame,
    *,
    channel_filter: str | None,
    brand_pattern: str | None,
) -> pd.DataFrame:
    """Filtra el dataframe ya merged por canal y marca de un segmento."""
    df = merged.copy()

    # Excluir CMBC co-packing del retail (regla 3 del prompt)
    df = df[~df["Sales Channel"].astype(str).str.contains("CO.?PACK", case=False, na=False, regex=True)]

    if channel_filter:
        df = df[df["Sales Channel"].astype(str).str.contains(channel_filter, case=False, na=False)]

    if brand_pattern:
        brand_text = (
            df["Business Brands"].fillna("").astype(str)
            + " | "
            + df["Marca"].fillna("").astype(str)
        )
        df = df[brand_text.str.contains(brand_pattern, case=False, na=False, regex=True)]

    return df


def aggregate_weekly_by_segment(
    merged: pd.DataFrame,
    *,
    channel_filter: str | None,
    brand_pattern: str | None,
) -> pd.DataFrame:
    """Agrega a semanal filtrando por segmento. Devuelve el panel limpio."""
    sliced = _filter_segment_rows(
        merged, channel_filter=channel_filter, brand_pattern=brand_pattern
    )
    if sliced.empty:
        return pd.DataFrame(columns=["semana_inicio", TARGET_VOLUME_COL, TARGET_REVENUE_COL])

    cleaned = clean_anomalies(sliced)
    return aggregate_weekly(cleaned)


def build_segment_panels(
    *,
    uk_only: bool = True,
) -> dict[str, pd.DataFrame]:
    """
    Construye un panel semanal por segmento + agregado total.

    Retorna dict {segment_id: weekly_df_con_features}. Cada panel ya tiene
    promos, fútbol y features de calendario aplicados.
    """
    sales, materials, customers = load_raw_tables()
    merged = merge_dimensions(sales, materials, customers, uk_only=uk_only)

    promos = load_promotion_weeks()
    promos = extend_promotions_to_future(promos, weeks_ahead=FORECAST_HORIZON_WEEKS + 8)
    football = load_football_impact()

    panels: dict[str, pd.DataFrame] = {}
    per_segment_weekly: list[pd.DataFrame] = []

    for seg in SEGMENTS:
        if seg["segment_id"] == "total_uk_retail":
            continue  # se construye al final sumando los segmentos retail

        weekly = aggregate_weekly_by_segment(
            merged,
            channel_filter=seg["channel_filter"],
            brand_pattern=seg["brand_pattern"],
        )
        if weekly.empty:
            continue

        weekly = add_promotion_flag(weekly, promos)
        weekly = add_football_impact(weekly, football)
        weekly = build_time_features(weekly)
        weekly = add_bank_holiday_features(weekly)
        weekly = load_weather_features(weekly)
        weekly["segment_id"] = seg["segment_id"]
        weekly["channel"] = seg["channel"]
        weekly["brand"] = seg["brand"]
        panels[seg["segment_id"]] = weekly
        per_segment_weekly.append(weekly[["semana_inicio", TARGET_VOLUME_COL, TARGET_REVENUE_COL]])

    # Agregado total retail = suma de los segmentos retail (excluye CMBC)
    if per_segment_weekly:
        total = pd.concat(per_segment_weekly, ignore_index=True)
        total = (
            total.groupby("semana_inicio", as_index=False)
            .agg({TARGET_VOLUME_COL: "sum", TARGET_REVENUE_COL: "sum"})
            .sort_values("semana_inicio")
            .reset_index(drop=True)
        )
        total["semana_fin"] = total["semana_inicio"] + pd.Timedelta(days=6)
        total = add_promotion_flag(total, promos)
        total = add_football_impact(total, football)
        total = build_time_features(total)
        total = add_bank_holiday_features(total)
        total = load_weather_features(total)
        total["segment_id"] = "total_uk_retail"
        total["channel"] = "ALL"
        total["brand"] = "ALL"
        panels["total_uk_retail"] = total

    return panels


if __name__ == "__main__":
    df = run_etl()
    print(f"Semanas preparadas: {len(df)}")
    print(df.tail(8).to_string())
