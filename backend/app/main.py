from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app import mocks, schemas
from app.services import briefing, forecast

app = FastAPI(
    title="MarketPulse UK API",
    description=(
        "Backend API for the MarketPulse Action Center — "
        "forecasting, gap diagnosis, action planning and what-if simulation for Damm UK."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=schemas.HealthResponse, tags=["System"])
def health():
    """Basic health check."""
    return {"status": "ok", "version": "0.1.0"}


# ─── Metrics ─────────────────────────────────────────────────────────────────

@app.get(
    "/api/metrics",
    response_model=schemas.MonthlyMetrics,
    tags=["Core"],
    summary="Monthly KPIs",
)
def get_metrics(month: str = Query(default="2026-05", description="Format: YYYY-MM")):
    """
    Returns the top-level monthly performance metrics:
    sales to date, target, forecast, gap and hit probability.
    """
    return mocks.MOCK_METRICS


# ─── Forecast ────────────────────────────────────────────────────────────────

@app.get(
    "/api/forecast",
    response_model=list[schemas.ForecastPoint],
    tags=["Core"],
    summary="Forecast time series",
)
def get_forecast(
    horizon: int = Query(default=6, ge=1, le=24, description="Weeks/months ahead"),
    channel: Optional[str] = Query(default=None, description="OFF_TRADE | ON_TRADE | ONLINE"),
):
    """
    Returns the sales forecast time series with confidence bands.
    Pau will replace the stub in services/forecast.py with real XGBoost output.
    """
    return forecast.predict_forecast(horizon=horizon, channel=channel)


# ─── Gap Drivers ─────────────────────────────────────────────────────────────

@app.get(
    "/api/gap-drivers",
    response_model=list[schemas.GapDriver],
    tags=["Core"],
    summary="Gap driver decomposition",
)
def get_gap_drivers(month: str = Query(default="2026-05")):
    """
    Decomposes the expected gap into business drivers (channel, brand, promo, timing).
    The sum of all impact values equals expectedGap from /api/metrics.
    """
    return [schemas.GapDriver(**d) for d in mocks.MOCK_GAP_DRIVERS]


# ─── Demand Windows ───────────────────────────────────────────────────────────

@app.get(
    "/api/demand-windows",
    response_model=list[schemas.DemandWindow],
    tags=["Core"],
    summary="Weekly demand opportunity windows",
)
def get_demand_windows(month: str = Query(default="2026-05")):
    """
    Returns week-by-week demand and promotional sensitivity analysis.
    Week 3 is typically the best activation window.
    """
    return [schemas.DemandWindow(**w) for w in mocks.MOCK_DEMAND_WINDOWS]


# ─── Action Plans ─────────────────────────────────────────────────────────────

@app.get(
    "/api/action-plans",
    response_model=list[schemas.ActionPlan],
    tags=["Core"],
    summary="Commercial recovery plans",
)
def get_action_plans(month: str = Query(default="2026-05")):
    """
    Returns the three recovery plans (conservative / balanced / aggressive)
    ranked by impact and confidence. The balanced plan is marked as recommended.
    """
    return [schemas.ActionPlan(**p) for p in mocks.MOCK_ACTION_PLANS]


# ─── Simulator ───────────────────────────────────────────────────────────────

_BASE_IMPACT = {"Low": 42000, "Medium": 82000, "High": 128000}
_CHANNEL_MULT = {"Off-Trade": 1.2, "On-Trade": 0.85, "Online": 0.75}
_BRAND_MULT = {"Estrella Damm": 1.15, "Voll-Damm": 0.90, "Estrella Daura": 0.80}
_WEEK_MULT = {"Week 1": 0.60, "Week 2": 0.75, "Week 3": 1.25, "Week 4": 0.95}

_BASELINE_FORECAST = 1_080_000
_MONTHLY_TARGET = 1_200_000
_BASE_PROBABILITY = 34

_WEEK_SCORES = {"Week 1": 42, "Week 2": 58, "Week 3": 87, "Week 4": 76}


@app.post(
    "/api/simulate",
    response_model=schemas.SimulationResult,
    tags=["Simulator"],
    summary="What-if scenario simulation",
)
def simulate(req: schemas.SimulateRequest):
    """
    Deterministic what-if simulation.
    Combines promotion intensity, channel, brand and activation week
    to estimate incremental impact and updated hit probability.
    """
    channel_mult = _CHANNEL_MULT.get(req.channel, 1.0)
    brand_mult = _BRAND_MULT.get(req.brand, 1.0)
    week_mult = _WEEK_MULT.get(req.week, 1.0)

    incremental = round(
        _BASE_IMPACT[req.intensity] * channel_mult * brand_mult * week_mult
    )
    new_forecast = _BASELINE_FORECAST + incremental
    remaining_gap = new_forecast - _MONTHLY_TARGET
    hit_prob = min(92, max(_BASE_PROBABILITY, round(_BASE_PROBABILITY + incremental / 4000)))

    score = _WEEK_SCORES.get(req.week, 70)
    direction = (
        "above target"
        if remaining_gap >= 0
        else f"£{abs(remaining_gap / 1000):.0f}k below target"
    )
    explanation = (
        f"This scenario targets {req.channel} with {req.brand} during {req.week} "
        f"(opportunity score: {score}/100). "
        f"The incremental impact brings the monthly forecast to "
        f"£{new_forecast / 1000:.0f}k — {direction}."
    )

    return schemas.SimulationResult(
        newForecast=new_forecast,
        remainingGap=remaining_gap,
        hitProbability=hit_prob,
        incrementalImpact=incremental,
        explanation=explanation,
    )


# ─── Goal Seek ────────────────────────────────────────────────────────────────

@app.post(
    "/api/goal-seek",
    response_model=list[schemas.ActionPlan],
    tags=["Simulator"],
    summary="Reverse simulation: find plans that hit a revenue target",
)
def goal_seek(req: schemas.GoalSeekRequest):
    """
    Given a target revenue, returns the top plans that can reach it.
    Currently returns mock variants of the three standard plans scaled to the target.
    """
    gap_to_close = req.targetRevenue - _BASELINE_FORECAST
    plans = []

    for i, base in enumerate(mocks.MOCK_ACTION_PLANS):
        scale = gap_to_close / 136000 if 136000 > 0 else 1.0
        scaled = dict(base)
        scaled["expectedImpact"] = round(base["expectedImpact"] * scale)
        scaled["forecastAfterAction"] = round(_BASELINE_FORECAST + scaled["expectedImpact"])
        scaled["remainingGap"] = round(scaled["forecastAfterAction"] - req.targetRevenue)
        scaled["hitProbability"] = min(
            92,
            max(34, round(34 + scaled["expectedImpact"] / 4000)),
        )
        scaled["actions"] = base["actions"]
        plans.append(schemas.ActionPlan(**scaled))

    plans.sort(key=lambda p: abs(p.remainingGap))
    return plans[:3]


# ─── Backtest ─────────────────────────────────────────────────────────────────

@app.get(
    "/api/backtest",
    response_model=schemas.BacktestResult,
    tags=["Validation"],
    summary="Historical forecast accuracy",
)
def get_backtest(months: int = Query(default=12, ge=1, le=36)):
    """
    Returns historical forecast accuracy metrics and a counterfactual
    estimate of the commercial value MarketPulse would have generated.
    """
    data = dict(mocks.MOCK_BACKTEST)
    data["historicalForecastVsActual"] = data["historicalForecastVsActual"][:months]
    return schemas.BacktestResult(**data)


# ─── Briefing (LLM — NOT a stub) ─────────────────────────────────────────────

@app.post(
    "/api/briefing",
    response_model=schemas.BriefingResponse,
    tags=["Intelligence"],
    summary="Generate Director's Briefing via Groq LLM",
)
def post_briefing(req: schemas.BriefingRequest):
    """
    Calls Groq (llama-3.3-70b-versatile) to generate a concise,
    actionable director-level briefing based on the provided context.

    Requires GROQ_API_KEY in backend/.env.
    Returns 503 if the LLM service is unavailable.
    """
    try:
        result = briefing.generate_briefing(req.context)
        return schemas.BriefingResponse(**result)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Briefing service unavailable: {exc}",
        ) from exc
