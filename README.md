# MarketPulse Action Center

**An explainable commercial cockpit that predicts whether UK will hit the monthly target, explains the expected gap, and recommends the best commercial actions to close it.**

---

## Stack

| Tool | Purpose |
|------|---------|
| Vite + React + TypeScript | App framework |
| Tailwind CSS | Styling |
| Recharts | Charts |
| lucide-react | Icons |

The Vite frontend talks to an optional FastAPI backend (`backend/`) that
serves the LightGBM forecast produced by the analytics pipeline (`analytics/`).
A pre-baked snapshot (`public/forecast_results.json`) and a bundled mock keep
the UI working when Python is not available.

---

## Getting started

### Frontend only (snapshot or mock)

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). With no backend running
the dashboard reads `public/forecast_results.json` (analytics snapshot). If
that file is missing too, it falls back to the bundled mock in
`src/data/mockData.ts` — the UI never breaks offline.

### Full stack (live forecast)

In one terminal, start the FastAPI service:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate           # Windows (use `source .venv/bin/activate` on macOS/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

In another, start the frontend:

```bash
pnpm install
pnpm dev
```

The Vite dev server proxies `/api/*` → `http://localhost:8000` (see
`vite.config.ts`), so the app calls `/api/forecast` without CORS friction.

Copy `.env.example` to `.env.local` if you want to point the gateway at a
remote backend or change the forecast horizon:

```bash
VITE_API_BASE_URL=http://api.example.com   # leave empty to use the dev proxy
VITE_FORECAST_HORIZON=12                   # weeks requested from /api/forecast
```

### Integration boundary

Backend payloads never reach UI components directly. The flow is:

```
FastAPI /api/forecast  ─┐
                        ├─►  src/data/adapters/  ─►  SalesMomentumData  ─►  components
public/forecast_results.json ─┘                       (stable frontend contract)
src/data/mockData.ts (fallback) ────────────────────────────────────────►  components
```

`src/data/gateway/marketPulseGateway.ts` picks the best available source
(API → snapshot → mock) and tags the result with `source: 'api' | 'snapshot' | 'mock'`.

---

## Demo flow

Navigate through the 5 sections in order for the best storytelling:

1. **Executive Pulse** — Will UK hit the March target? (KPIs, forecast trajectory, status)
2. **Gap Diagnosis** — What is driving the gap? (driver breakdown, brand & channel analysis)
3. **Demand Windows** — When should we act? (week-by-week opportunity scoring)
4. **Action Planner** — What should we do now? (three recovery plans with actions)
5. **What-if Simulator** — What happens if we change the plan? (live impact simulation)

---

## Project structure

```
src/
├── data/
│   └── mockData.ts          ← All mock data (brands: Estrella Damm, Voll-Damm, Estrella Daura)
├── types/
│   └── index.ts             ← TypeScript types
├── utils/
│   ├── formatters.ts        ← Currency, percent, progress helpers
│   └── simulator.ts         ← What-if simulation logic
├── constants/
│   └── navigation.ts        ← Nav items & section IDs
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── common/
│   │   ├── MetricCard.tsx
│   │   ├── InsightCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── ProgressBar.tsx
│   │   └── EmptyState.tsx
│   ├── charts/
│   │   ├── ForecastChart.tsx
│   │   ├── GapDriversChart.tsx
│   │   ├── OpportunityChart.tsx
│   │   └── ChannelMixChart.tsx
│   └── sections/
│       ├── ExecutivePulse.tsx
│       ├── GapDiagnosis.tsx
│       ├── DemandWindows.tsx
│       ├── ActionPlanner.tsx
│       └── WhatIfSimulator.tsx
├── App.tsx
├── main.tsx
└── index.css
```

---

## Mock data context

The demo is configured for **UK · March 2025**:

- Monthly target: **£1,200,000**
- Sales to date: **£742,000**
- Baseline forecast: **£1,080,000** (gap: **-£120,000**)
- Brands: **Estrella Damm**, **Voll-Damm**, **Estrella Daura**
- Hit probability (no action): **34%** → Balanced Recovery plan raises it to **74%**

---

> This is a hackathon prototype using representative mock data. The architecture is designed to connect to real Damm UK sales, budget and promotion datasets.

**Damm × Engineering HUB · Hackathon 2025**
