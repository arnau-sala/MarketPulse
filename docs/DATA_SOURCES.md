# MarketPulse — Data Sources & Limitations

## Internal datasets (confidential — not committed to git)

| File | Description | Location |
|---|---|---|
| `UK DATA.xlsx` | Weekly UK sales by channel, brand and customer (2022–2026). Columns include Hl, Venta Neta (kEUR), Hay_Promocion. | `data/` (gitignored) |
| `Damm Trade Plan - promotions.xlsx` | 2026 trade promotion plan: retailer, brand, mechanic, dates. | `data/` (gitignored) |
| `data/weekly_features.csv` | Merged feature matrix used for model training. Derived from the two files above + external enrichment. | `data/` (gitignored) |

## Pipeline outputs (not committed — regenerate with `python -m analytics.run_pipeline`)

| File | Description |
|---|---|
| `data/processed/forecast_weekly.csv` | LightGBM forecast by segment, 8-week horizon. Columns: fecha, tipo (historico/forecast), segmento, venta_real, prediccion, limite_inferior_80, limite_superior_80. Values in **Hl**. |
| `data/processed/forecast_monthly.csv` | Monthly aggregation of forecast_weekly. |
| `data/processed/model_metrics.json` | MAPE, WAPE, RMSE per segment and global. Trained 2022–2025, validated 2025–2026. |
| `data/processed/calibrated_multipliers.json` | Promotion uplift multipliers calibrated on 18 promo weeks (Jan–Apr 2026). Used by `/api/simulate` and `simulator.ts`. |

## External / enrichment features

| Feature | Source | Status |
|---|---|---|
| Bank holidays | UK government open data (hardcoded calendar 2022–2026) | Active |
| Weather proxy | Temperature + sunshine hours from UK climate averages | Active |
| Football impact (`Impacto_Futbol`) | Match importance proxy | **Disabled** — column held at 0 until differentiated weights are available |

## Revenue conversion (Hl → £)

The LightGBM model predicts volume in **Hl** (hectoliters). The UI displays £.

Conversion: `rev_per_hl = total_Venta_Neta (kEUR × 1000 × 0.86 EUR/GBP) / total_Hl`

Derived from `data/weekly_features.csv`. Fallback: **£228/Hl** if the file is absent.

Stored in `public/forecast_results.json` → `meta.revenuePerHlGbp` for the frontend snapshot.

## Model limitations (honest)

| Limitation | Impact |
|---|---|
| Promo data only available for Jan–Apr 2026 | Model has not learned historical promo effects 2023–2025 |
| WAPE ~36% for total_uk_retail | Directional forecast — not a precise point estimate |
| Co-packing (CMBC) excluded | B2B channel not modelled |
| Football feature disabled | Potential uplift signal not captured |
| Monthly target = demo planning target | No real budget file available; documented as assumption |
| Hl → £ conversion varies | £228/Hl is a long-run average; intra-year variance not modelled |

## Demo planning target

`DEMO_MONTHLY_TARGET_GBP = £1,200,000` is a planning target for demo purposes.
It is **not** the official Damm UK sales budget for May 2026.
All gap and hit-probability calculations use this target consistently across all sections.
