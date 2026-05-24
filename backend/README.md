# MarketPulse UK — Backend API

FastAPI backend serving forecast data, gap analysis, recovery plans,
what-if simulation and an LLM-powered director briefing.

---

## Stack

| Tool | Purpose |
|---|---|
| FastAPI + Uvicorn | HTTP API |
| Pydantic v2 | Request/response validation |
| pandas | CSV data loading |
| LightGBM | Forecast model (via analytics pipeline) |
| Groq SDK | LLM briefing — **lazy import, optional** |

---

## Getting started

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Optional: add GROQ_API_KEY for AI briefing

uvicorn app.main:app --reload --port 8000
```

The backend starts **without Groq** — the LLM import is lazy and falls back to a
local template if the package is missing or the API key is not set.

---

## API endpoints

| Method | Path | Data source |
|---|---|---|
| GET | `/api/health` | — |
| GET | `/api/forecast` | forecast_weekly.csv → LightGBM live → mock |
| GET | `/api/metrics` | forecast_weekly.csv → mock |
| GET | `/api/gap-drivers` | mock (calibrated values from real data) |
| GET | `/api/demand-windows` | mock |
| GET | `/api/action-plans` | mock (calibrated from gap drivers + simulator) |
| POST | `/api/simulate` | calibrated_multipliers.json |
| POST | `/api/goal-seek` | derived from action plans |
| GET | `/api/backtest` | model_metrics.json → mock |
| POST | `/api/briefing` | Groq LLM → local fallback |
| POST | `/api/explain-plan` | Groq LLM → local fallback |

Interactive docs: http://localhost:8000/docs

---

## Groq (LLM) fallback

The `/api/briefing` and `/api/explain-plan` endpoints **never return 503**.
If `GROQ_API_KEY` is missing, the groq package is not installed, or the API call fails,
the service returns a 200 response with `model: "fallback-local"` and a pre-built template.

---

## Data files required (gitignored)

```
data/
├── UK DATA.xlsx                       ← source sales data
├── Damm Trade Plan - promotions.xlsx  ← 2026 promo plan
├── weekly_features.csv                ← merged feature matrix
└── processed/
    ├── forecast_weekly.csv            ← pipeline output (Hl by segment)
    ├── model_metrics.json             ← MAPE/WAPE per segment
    └── calibrated_multipliers.json    ← promo uplift multipliers
```

Regenerate with: `python -m analytics.run_pipeline` (from project root).

---

## Smoke test

```bash
cd backend
python -m pytest tests/test_smoke.py -v
```

Tests that the app imports cleanly, health check responds, and key endpoints return data.
