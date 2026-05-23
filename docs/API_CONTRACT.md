# MarketPulse UK — API Contract

Base URL: `http://localhost:8000`  
Frontend origin: `http://localhost:5173`  
All responses use **camelCase** keys (TypeScript convention).

---

## Endpoints

### `GET /api/health`
**Status**: ✅ Live

Health check.

**Response**
```json
{ "status": "ok", "version": "0.1.0" }
```

---

### `GET /api/metrics`
**Status**: 🟡 Stub (returns mock data)

Monthly KPI summary.

**Query params**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `month` | string | `2026-05` | Format: `YYYY-MM` |

**Response — `MonthlyMetrics`**
```json
{
  "market": "UK",
  "month": "May 2026",
  "salesToDate": 742000,
  "monthlyTarget": 1200000,
  "baselineForecast": 1080000,
  "expectedGap": -120000,
  "hitProbability": 34,
  "status": "At Risk",
  "lastUpdated": "Today · 09:00"
}
```

---

### `GET /api/forecast`
**Status**: 🟡 Stub — Pau replaces `services/forecast.py`

Forecast time series with confidence bands.

**Query params**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `horizon` | int | `6` | Weeks/months ahead (1–24) |
| `channel` | string | `null` | `OFF_TRADE` \| `ON_TRADE` \| `ONLINE` |

**Response — `ForecastPoint[]`**
```json
[
  {
    "date": "May 01",
    "actual": 38000,
    "target": 40000,
    "forecast": 38000,
    "actionForecast": null,
    "confidenceLow": 35000,
    "confidenceHigh": 41000
  }
]
```

---

### `GET /api/gap-drivers`
**Status**: 🟡 Stub

Gap decomposition by driver. Sum of all `impact` values equals `expectedGap`.

**Query params**
| Param | Type | Default |
|-------|------|---------|
| `month` | string | `2026-05` |

**Response — `GapDriver[]`**
```json
[
  {
    "name": "Off-Trade underperformance",
    "impact": -52000,
    "share": 43,
    "explanation": "Off-Trade is trending below expected pace...",
    "dimension": "Channel"
  }
]
```

`dimension` is one of: `Channel` | `Brand` | `Promotion` | `Timing` | `Customer`

---

### `GET /api/demand-windows`
**Status**: 🟡 Stub

Week-by-week demand and promotional sensitivity.

**Query params**
| Param | Type | Default |
|-------|------|---------|
| `month` | string | `2026-05` |

**Response — `DemandWindow[]`**
```json
[
  {
    "week": "Week 3",
    "baselineDemand": "High",
    "promoSensitivity": "High",
    "opportunityScore": 87,
    "recommendation": "Activate",
    "explanation": "Best window: strong demand, high sensitivity..."
  }
]
```

---

### `GET /api/action-plans`
**Status**: 🟡 Stub

Three recovery plans ranked by expected impact.

**Query params**
| Param | Type | Default |
|-------|------|---------|
| `month` | string | `2026-05` |

**Response — `ActionPlan[]`** (always 3 elements: conservative, balanced, aggressive)
```json
[
  {
    "id": "balanced",
    "name": "Balanced Recovery",
    "label": "Recommended",
    "recommended": true,
    "goal": "Close the expected gap",
    "expectedImpact": 136000,
    "forecastAfterAction": 1216000,
    "remainingGap": 16000,
    "hitProbability": 74,
    "risk": "Medium",
    "explanation": "...",
    "actions": [
      {
        "title": "Push Estrella Damm in Off-Trade",
        "week": "Week 3",
        "impact": 58000,
        "confidence": 82,
        "why": "..."
      }
    ]
  }
]
```

---

### `POST /api/simulate`
**Status**: ✅ Live (deterministic logic)

What-if scenario simulation.

**Request body — `SimulateRequest`**
```json
{
  "intensity": "Medium",
  "channel": "Off-Trade",
  "brand": "Estrella Damm",
  "week": "Week 3"
}
```

`intensity`: `Low` | `Medium` | `High`  
`channel`: `Off-Trade` | `On-Trade` | `Online`  
`brand`: `Estrella Damm` | `Voll-Damm` | `Estrella Daura`  
`week`: `Week 1` | `Week 2` | `Week 3` | `Week 4`

**Response — `SimulationResult`**
```json
{
  "newForecast": 1163700,
  "remainingGap": -36300,
  "hitProbability": 63,
  "incrementalImpact": 83700,
  "explanation": "This scenario targets Off-Trade with Estrella Damm during Week 3 (opportunity score: 87/100)..."
}
```

**Simulation logic**
```
base_impact = {Low: 42000, Medium: 82000, High: 128000}
channel_mult = {Off-Trade: 1.2, On-Trade: 0.85, Online: 0.75}
brand_mult = {Estrella Damm: 1.15, Voll-Damm: 0.90, Estrella Daura: 0.80}
week_mult = {Week 1: 0.60, Week 2: 0.75, Week 3: 1.25, Week 4: 0.95}

impact = base_impact[intensity] × channel_mult × brand_mult × week_mult
new_forecast = 1_080_000 + impact
remaining_gap = new_forecast − 1_200_000
hit_probability = clamp(34 + impact / 4000, 34, 92)
```

---

### `POST /api/goal-seek`
**Status**: 🟡 Stub (returns scaled mock plans)

Reverse simulation: given a revenue target, returns plans that can reach it.

**Request body — `GoalSeekRequest`**
```json
{ "targetRevenue": 1300000, "month": "2026-05" }
```

**Response — `ActionPlan[]`** (top 3 plans sorted by distance to target)

---

### `GET /api/backtest`
**Status**: 🟡 Stub

Historical forecast accuracy and counterfactual value estimate.

**Query params**
| Param | Type | Default | Range |
|-------|------|---------|-------|
| `months` | int | `12` | 1–36 |

**Response — `BacktestResult`**
```json
{
  "mape": 8.4,
  "wape": 7.1,
  "historicalForecastVsActual": [
    { "month": "Nov 2025", "actual": 1098000, "forecast": 1075000 },
    { "month": "Dec 2025", "actual": 1305000, "forecast": 1270000 }
  ],
  "counterfactualValue": 180000,
  "counterfactualExplanation": "If MarketPulse had been active in the last 6 months..."
}
```

---

### `POST /api/briefing` ⭐
**Status**: ✅ Live — calls Groq LLM (requires `GROQ_API_KEY`)

Generates a director-level commercial briefing in natural language.  
Returns `503` if the LLM service is unavailable.

**Request body — `BriefingRequest`**
```json
{
  "context": {
    "month": "May 2026",
    "salesToDate": 742000,
    "monthlyTarget": 1200000,
    "expectedGap": -120000,
    "status": "At Risk",
    "topGapDriver": "Off-Trade underperformance",
    "recommendedAction": "Activate Balanced Recovery plan in Week 3"
  }
}
```

**Response — `BriefingResponse`**
```json
{
  "text": "Team UK, this month we are tracking 10% below the £1.2M target...",
  "generatedAt": "2026-05-23T09:00:00Z",
  "model": "llama-3.3-70b-versatile"
}
```

**Error response (503)**
```json
{ "detail": "Briefing service unavailable: GROQ_API_KEY is not set..." }
```

---

## Implementation status summary

| Endpoint | Method | Status | Owner |
|----------|--------|--------|-------|
| `/api/health` | GET | ✅ Live | — |
| `/api/metrics` | GET | 🟡 Stub | Yeray (connect Pau's data) |
| `/api/forecast` | GET | 🟡 Stub | **Pau** |
| `/api/gap-drivers` | GET | 🟡 Stub | Yeray |
| `/api/demand-windows` | GET | 🟡 Stub | Yeray |
| `/api/action-plans` | GET | 🟡 Stub | Yeray |
| `/api/simulate` | POST | ✅ Live | Yeray |
| `/api/goal-seek` | POST | 🟡 Stub | Yeray |
| `/api/backtest` | GET | 🟡 Stub | Pau |
| `/api/briefing` | POST | ✅ Live | Yeray |
