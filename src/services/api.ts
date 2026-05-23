import type {
  MonthlyMetrics,
  GapDriver,
  DemandWindow,
  ActionPlan,
  ChannelPerformance,
  BrandPerformance,
} from '../types';
import type { ForecastPoint } from '../types';
import type { PromoIntensity, Channel, Brand, Week, SimulatorResult } from '../types';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ─── Max historical points to keep before passing to chart components ─────────
// 52 = one full year of weekly history; chart filters further per period view.
const MAX_HISTORY_POINTS = 52;

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function get<T>(path: string, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── Raw backend types ────────────────────────────────────────────────────────

interface RawForecastPoint {
  date: string;
  actual: number | null;
  target: number;
  forecast: number;
  actionForecast: number | null;
  confidenceLow: number | null;
  confidenceHigh: number | null;
}

export interface BriefingResponse {
  text: string;
  generatedAt: string;
  model: string;
}

export interface BriefingContext {
  month: string;
  salesToDate: number;
  monthlyTarget: number;
  expectedGap: number;
  status: string;
  topGapDriver: string;
  recommendedAction: string;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export async function getMetrics(month = '2026-05'): Promise<MonthlyMetrics> {
  return get<MonthlyMetrics>(`/api/metrics?month=${month}`);
}

export async function getForecast(horizon = 8): Promise<ForecastPoint[]> {
  const raw = await get<RawForecastPoint[]>(`/api/forecast?horizon=${horizon}`);

  // Separate history and future
  const history = raw.filter(p => p.actual !== null);
  const future  = raw.filter(p => p.actual === null);

  // Limit history to the last MAX_HISTORY_POINTS weeks to keep the chart readable
  const trimmedHistory = history.slice(-MAX_HISTORY_POINTS);

  // Normalize `date` → `day` for ForecastChart compatibility; keep ISO date for grouping
  return [...trimmedHistory, ...future].map(p => ({
    day: p.date,          // display label  e.g. "May 04"
    isoDate: p.date,      // full ISO date  e.g. "2026-05-04"
    actual: p.actual,
    target: p.target,
    forecast: p.forecast,
    actionForecast: p.actionForecast,
  }));
}

export async function getGapDrivers(month = '2026-05'): Promise<GapDriver[]> {
  return get<GapDriver[]>(`/api/gap-drivers?month=${month}`);
}

export async function getDemandWindows(month = '2026-05'): Promise<DemandWindow[]> {
  return get<DemandWindow[]>(`/api/demand-windows?month=${month}`);
}

export async function getActionPlans(month = '2026-05'): Promise<ActionPlan[]> {
  return get<ActionPlan[]>(`/api/action-plans?month=${month}`);
}

export async function getChannelPerformance(): Promise<ChannelPerformance[]> {
  // Backend doesn't have a dedicated endpoint yet — derive from gap drivers
  // until the real endpoint is wired to Pau's segmented data
  return get<ChannelPerformance[]>('/api/channel-performance').catch(() => {
    // Fallback to mock shape until endpoint is ready
    throw new Error('channel-performance not available');
  });
}

export async function getBrandPerformance(): Promise<BrandPerformance[]> {
  return get<BrandPerformance[]>('/api/brand-performance').catch(() => {
    throw new Error('brand-performance not available');
  });
}

export async function simulate(
  intensity: PromoIntensity,
  channel: Channel,
  brand: Brand,
  week: Week,
): Promise<SimulatorResult & { explanation: string }> {
  return post('/api/simulate', { intensity, channel, brand, week });
}

export async function generateBriefing(context: BriefingContext): Promise<BriefingResponse> {
  return post('/api/briefing', { context });
}

export interface ExplainPlanRequest {
  planId: string;
  planName: string;
  goal: string;
  expectedImpact: number;
  hitProbability: number;
  risk: string;
  actions: Array<{ title: string; week: string; impact: number; confidence: number; why: string }>;
  gapContext?: { salesToDate: number; monthlyTarget: number; expectedGap: number };
}

export async function explainPlan(req: ExplainPlanRequest): Promise<BriefingResponse> {
  return post('/api/explain-plan', req);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const r = await get<{ status: string }>('/api/health');
    return r.status === 'ok';
  } catch {
    return false;
  }
}
