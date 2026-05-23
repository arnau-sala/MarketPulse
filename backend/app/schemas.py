from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class MonthlyMetrics(BaseModel):
    market: str
    month: str
    salesToDate: int
    monthlyTarget: int
    baselineForecast: int
    expectedGap: int
    hitProbability: int
    status: Literal["On Track", "At Risk", "Critical", "Ahead"]
    lastUpdated: str


class ForecastPoint(BaseModel):
    date: str
    actual: Optional[int] = None
    target: int
    forecast: int
    actionForecast: Optional[int] = None
    confidenceLow: Optional[int] = None
    confidenceHigh: Optional[int] = None


class GapDriver(BaseModel):
    name: str
    impact: int
    share: int
    explanation: str
    dimension: Literal["Channel", "Brand", "Promotion", "Timing", "Customer"]


class DemandWindow(BaseModel):
    week: str
    baselineDemand: Literal["Low", "Medium", "High"]
    promoSensitivity: Literal["Low", "Medium", "High"]
    opportunityScore: int
    recommendation: str
    explanation: str


class ActionItem(BaseModel):
    title: str
    week: str
    impact: int
    confidence: int
    why: str


class ActionPlan(BaseModel):
    id: str
    name: str
    label: str
    recommended: bool
    goal: str
    expectedImpact: int
    forecastAfterAction: int
    remainingGap: int
    hitProbability: int
    risk: Literal["Low", "Medium", "High"]
    explanation: str
    actions: List[ActionItem]


class SimulateRequest(BaseModel):
    intensity: Literal["Low", "Medium", "High"]
    channel: str
    brand: str
    week: str


class SimulationResult(BaseModel):
    newForecast: int
    remainingGap: int
    hitProbability: int
    incrementalImpact: int
    explanation: str


class GoalSeekRequest(BaseModel):
    targetRevenue: float = Field(gt=0)
    month: str


class HistoricalForecastPoint(BaseModel):
    month: str
    actual: int
    forecast: int


class BacktestResult(BaseModel):
    mape: float
    wape: float
    historicalForecastVsActual: List[HistoricalForecastPoint]
    counterfactualValue: int
    counterfactualExplanation: str


class BriefingRequest(BaseModel):
    context: dict


class BriefingResponse(BaseModel):
    text: str
    generatedAt: str
    model: str


class ExplainPlanRequest(BaseModel):
    planId: str
    planName: str
    goal: str
    expectedImpact: int
    hitProbability: int
    risk: str
    actions: List[dict]  # [{title, week, impact, confidence, why}]
    gapContext: Optional[dict] = None  # {salesToDate, monthlyTarget, expectedGap}


class HealthResponse(BaseModel):
    status: str
    version: str
