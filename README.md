# MarketPulse Action Center

**An explainable commercial cockpit for Damm UK.**
Predicts whether the UK team will hit the May 2026 monthly target, explains the gap by driver,
identifies the best activation window, and recommends ranked commercial recovery plans.

---

## Stack

| Layer | Tools |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Recharts |
| Backend | FastAPI + Uvicorn + Pydantic v2 |
| Model | LightGBM — trained on 175 weeks of UK sales (2022–2026) |
| LLM | Groq `llama-3.3-70b-versatile` (optional — local fallback if unavailable) |
| Pipeline | Python analytics/ — ETL + LightGBM + calibration |

---

## Quick start — Frontend only

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Works offline with snapshot/mock data.
No Python or API key required.

---

## Full-stack demo

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # macOS/Linux

pip install -r requirements.txt

cp .env.example .env
# Add GROQ_API_KEY to .env for AI briefing (optional)

uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (separate terminal)

```bash
npm install
npm run dev
```

---

## Architecture — data fallback chain

Every data request in the frontend tries layers in order:

```
1. Live API (GET /api/…)          → source badge: "Live API"
2. Mock data (bundled TypeScript)  → source badge: "Demo data"
```

The backend itself also has a fallback chain per endpoint:

```
1. Real CSV  (data/processed/forecast_weekly.csv)   → data-driven
2. Mock data (backend/app/mocks.py)                 → always available
```

This means the demo works at any of three levels:
- **Full-stack**: API + real CSV + optional Groq LLM
- **Backend only**: API with mock data fallback
- **Frontend only**: snapshot + bundled mock

---

## Key endpoints

| Endpoint | Status | Data source |
|---|---|---|
| `GET /api/health` | Live | — |
| `GET /api/forecast` | Live | forecast_weekly.csv → mock |
| `GET /api/metrics` | Live | forecast_weekly.csv → mock |
| `GET /api/gap-drivers` | Live | mock (data-driven P3 roadmap) |
| `GET /api/demand-windows` | Live | mock |
| `GET /api/action-plans` | Live | mock |
| `POST /api/simulate` | Live | calibrated_multipliers.json |
| `POST /api/briefing` | Live | Groq LLM → local fallback |
| `POST /api/explain-plan` | Live | Groq LLM → local fallback |
| `GET /api/backtest` | Live | model_metrics.json → mock |

---

## Regenerate forecast data

```bash
# From project root with data/UK DATA.xlsx present:
python -m analytics.run_pipeline
```

Outputs go to `data/processed/`. Copy `forecast_weekly.csv` to `public/forecast_results.json` via:

```bash
python scripts/recover_from_transcript.py  # or manually update the snapshot
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm run dev` fails with Rollup error | `rm -rf node_modules && npm install` |
| Backend won't start | Check Python ≥ 3.11. Try `pip install -r requirements.txt` again. |
| Groq briefing returns error | Not blocking — the app uses a local fallback. Set `GROQ_API_KEY` in `backend/.env` for AI version. |
| Forecast shows mock data | `data/processed/forecast_weekly.csv` missing — run the analytics pipeline or use frontend-only mode. |
| TypeScript errors | `npm run build` to see full list. Common: unused imports in section components. |

---

## Project structure

```
MarketPulse/
├── src/
│   ├── config/demoConfig.ts      ← single source of truth (May 2026 constants)
│   ├── services/
│   │   ├── api.ts                ← Groq briefing/explain calls
│   │   └── marketPulseApi.ts     ← all other API calls with API→mock fallback
│   ├── components/sections/      ← main UI sections
│   └── data/
│       ├── mockData.ts           ← fallback data (only used inside services)
│       └── gateway/              ← SalesMomentumChart data layer
├── backend/
│   ├── app/
│   │   ├── main.py               ← FastAPI routes
│   │   ├── mocks.py              ← fallback mock data
│   │   ├── schemas.py            ← Pydantic models
│   │   └── services/
│   │       ├── briefing.py       ← Groq LLM (lazy import, local fallback)
│   │       ├── forecast.py       ← LightGBM forecast service
│   │       └── data_reader.py    ← reads data/processed/ for metrics/backtest
├── analytics/                    ← ETL + LightGBM pipeline
├── data/processed/               ← pipeline outputs (gitignored)
└── docs/
    ├── API_CONTRACT.md
    ├── DATA_SOURCES.md
    └── DEMO_SCRIPT.md
```

---

## Demo flow (5 min)

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the full script.

**Story:** Gap detected → cause explained → best window identified → plan recommended → team briefed.
