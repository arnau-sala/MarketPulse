# MarketPulse — Demo Script (3–5 min)

> Audience: hackathon judges, commercial director persona
> Context: May 2026, UK market, Damm Group

---

## 0. Setup (30 s, before presenting)

- Backend running: `cd backend && uvicorn app.main:app --reload`
- Frontend running: `npm run dev` → open `http://localhost:5173`
- Start on **Command Center** tab

---

## 1. The Problem (30 s)

> "Every commercial team faces the same problem mid-month: are we going to hit the target? And if not, what do we do?
> Today, that answer comes from a spreadsheet — updated every Friday, already three days late.
> MarketPulse turns that into a real-time decision center."

---

## 2. Command Center — The Diagnosis (60 s)

**Point to the status banner:**
> "We're in May 2026. The UK team is **At Risk** — baseline forecast is £1.08M against a £1.2M target.
> That's a **£120k gap** with a 34% probability of hitting the objective."

**Point to the KPI strip:**
> "Sales to date, target, forecast, gap — all in one line. No spreadsheet."

**Point to the gap bridge waterfall:**
> "This is what makes MarketPulse different. We don't just show the problem —
> we show the path from the current forecast to the target, action by action.
> Off-Trade push: +£58k. Promo pull-forward: +£46k. SKU push: +£32k.
> That's the Balanced Recovery plan — and it gets us to £1.22M."

---

## 3. Gap Diagnosis — Why (30 s)

**Navigate to Gap Diagnosis:**
> "Where is the gap coming from? MarketPulse decomposes it:
> **43% is Off-Trade** — the biggest channel is underperforming its pace.
> 26% is brand mix. 20% is promotional mechanics weaker than expected.
> We know exactly where to focus."

---

## 4. Demand Windows — When (30 s)

**Navigate to Demand Windows:**
> "Knowing *where* isn't enough — you need to know *when*.
> MarketPulse scores each week of the month for demand level and promotional sensitivity.
> **Week 3** scores 87/100 — highest demand, highest promotional response, and there's still
> time to act before month close. That's the activation window."

---

## 5. Action Planner — What (45 s)

**Navigate to Action Planner:**
> "Three plans, ranked by impact and risk.
> We recommend the **Balanced Recovery** plan: three actions, medium risk, +£136k expected impact.
> Forecast goes from £1.08M to £1.22M — above target. Probability jumps from 34% to 74%."

**Click "Explain for my team":**
> "And for the field team? One click — an explanation in plain language, no jargon,
> that tells them exactly what to do this week."

---

## 6. What-If Simulator — Explore (30 s)

**Navigate to What-If Simulator:**
> "What if we go more aggressive? Change to High intensity — Off-Trade — Week 3.
> The simulator updates instantly: forecast goes to [X], probability to [Y]%.
> This runs against the same model as the backend — calibrated on 175 weeks of real UK data."

---

## 7. Director's Briefing — The Close (30 s)

**Navigate back to Command Center, click Generate:**
> "Finally, one click generates an executive briefing in plain Spanish for the commercial director.
> Not a dashboard — an email they can send to the team tonight."

---

## 8. Close (20 s)

> "MarketPulse doesn't just predict — it converts data into decisions.
> Gap detected → cause understood → best window identified → plan recommended → team briefed.
> That's the commercial decision cycle, in under five minutes."

---

## Q&A Prep

| Question | Answer |
|---|---|
| Is the model real? | Yes — LightGBM trained on 175 weeks of UK sales (2022–2026) |
| What's the accuracy? | WAPE ~36% for total_uk_retail — directional, not deterministic; value is in the decision layer |
| What data do you use? | UK DATA.xlsx (sales), Damm Trade Plan (promotions), bank holidays, weather proxy |
| Are retailer names anonymised? | Yes — no specific customer/retailer names in the UI |
| Can it work with a real budget file? | Yes — the target is a demo planning target; replace with the real budget CSV and it updates automatically |
