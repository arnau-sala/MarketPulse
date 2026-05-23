# MarketPulse UK — Backend API

FastAPI backend for the MarketPulse Action Center. Serves forecast data, gap analysis,
recovery plans, what-if simulation and an LLM-powered director briefing via Groq.

---

## Stack

| Tool | Purpose |
|------|---------|
| FastAPI + Uvicorn | HTTP API framework |
| Pydantic v2 | Request/response validation |
| Groq SDK | LLM briefing (llama-3.3-70b-versatile) |
| pandas + openpyxl | Data loading (Pau's XGBoost pipeline) |
| scikit-learn + xgboost | Forecast model (Pau) |

---

## Getting started

### 1. Create virtual environment

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Set up environment variables

```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

Get a free API key at [console.groq.com](https://console.groq.com).

### 4. Start the server

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Verify it works

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Test the briefing endpoint (requires GROQ_API_KEY)

```bash
curl -X POST http://localhost:8000/api/briefing \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "month": "May 2026",
      "salesToDate": 742000,
      "monthlyTarget": 1200000,
      "expectedGap": -120000,
      "status": "At Risk",
      "topGapDriver": "Off-Trade underperformance",
      "recommendedAction": "Activate Balanced Recovery plan in Week 3"
    }
  }'
```

### Test the simulator endpoint

```bash
curl -X POST http://localhost:8000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "intensity": "Medium",
    "channel": "Off-Trade",
    "brand": "Estrella Damm",
    "week": "Week 3"
  }'
```

---

## Integration with frontend

- Frontend (Vite): `http://localhost:5173`
- Backend (FastAPI): `http://localhost:8000`

CORS is configured to allow all requests from `http://localhost:5173`.

The frontend reads from `src/data/mockData.ts` by default. To switch to the real API,
add `src/services/api.ts` and replace the imports in each section component.

---

## For Pau — connecting your XGBoost model

Only one file to modify: `app/services/forecast.py`

The function signature must stay the same:
```python
def predict_forecast(horizon: int = 6, channel: Optional[str] = None) -> List[ForecastPoint]:
```

Steps:
1. Save your trained model: `joblib.dump(model, "../data/processed/model.pkl")`
2. Load it at module level in `forecast.py`
3. Replace the mock return with your real predictions
4. Return a list of `ForecastPoint` objects (schema is already imported)

Do **not** touch `app/main.py` or any other file.

---

## API endpoints

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/health` | ✅ Live |
| GET | `/api/metrics` | 🟡 Stub |
| GET | `/api/forecast` | 🟡 Stub (Pau replaces) |
| GET | `/api/gap-drivers` | 🟡 Stub |
| GET | `/api/demand-windows` | 🟡 Stub |
| GET | `/api/action-plans` | 🟡 Stub |
| POST | `/api/simulate` | ✅ Live (deterministic) |
| POST | `/api/goal-seek` | 🟡 Stub |
| GET | `/api/backtest` | 🟡 Stub |
| POST | `/api/briefing` | ✅ Live (Groq LLM) |

Full contract: see `../docs/API_CONTRACT.md`
