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

No backend. All data is mock and centralised in `src/data/mockData.ts`.

---

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173)

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
