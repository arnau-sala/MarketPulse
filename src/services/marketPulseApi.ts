/**
 * MarketPulse API client — layered fallback strategy for all endpoints.
 *
 * Each fetch function tries:
 *   1. Live FastAPI (GET/POST /api/…)       → source: "api"
 *   2. Bundled mock data                    → source: "mock"
 *
 * Every function returns { data, source } so components can show a
 * small "Data source: API / Demo" badge to the user.
 *
 * Timeout: 3 s — if the backend is sleeping we fall through immediately.
 */

import type {
  MonthlyMetrics,
  GapDriver,
  DemandWindow,
  ActionPlan,
} from '../types';
import {
  monthlyMetrics as mockMetrics,
  gapDrivers as mockGapDrivers,
  demandWindows as mockDemandWindows,
  actionPlans as mockActionPlans,
} from '../data/mockData';

export type DataSource = 'api' | 'mock';

export interface ApiResult<T> {
  data: T;
  source: DataSource;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const API_TIMEOUT_MS = 3000;

function url(path: string) {
  return `${API_BASE}${path}`;
}

async function getJson<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(url(path), { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export async function fetchMetrics(month = '2026-05'): Promise<ApiResult<MonthlyMetrics>> {
  const data = await getJson<MonthlyMetrics>(`/api/metrics?month=${encodeURIComponent(month)}`);
  if (data) return { data, source: 'api' };
  return { data: mockMetrics, source: 'mock' };
}

// ─── Gap drivers ──────────────────────────────────────────────────────────────

export async function fetchGapDrivers(month = '2026-05'): Promise<ApiResult<GapDriver[]>> {
  const data = await getJson<GapDriver[]>(`/api/gap-drivers?month=${encodeURIComponent(month)}`);
  if (data && Array.isArray(data) && data.length > 0) return { data, source: 'api' };
  return { data: mockGapDrivers, source: 'mock' };
}

// ─── Demand windows ───────────────────────────────────────────────────────────

export async function fetchDemandWindows(month = '2026-05'): Promise<ApiResult<DemandWindow[]>> {
  const data = await getJson<DemandWindow[]>(`/api/demand-windows?month=${encodeURIComponent(month)}`);
  if (data && Array.isArray(data) && data.length > 0) return { data, source: 'api' };
  return { data: mockDemandWindows, source: 'mock' };
}

// ─── Action plans ─────────────────────────────────────────────────────────────

export async function fetchActionPlans(month = '2026-05'): Promise<ApiResult<ActionPlan[]>> {
  const data = await getJson<ActionPlan[]>(`/api/action-plans?month=${encodeURIComponent(month)}`);
  if (data && Array.isArray(data) && data.length > 0) return { data, source: 'api' };
  return { data: mockActionPlans, source: 'mock' };
}

// ─── Simulate ─────────────────────────────────────────────────────────────────

export interface SimulateRequest {
  intensity: 'Low' | 'Medium' | 'High';
  channel: string;
  brand: string;
  week: string;
}

export interface SimulateResponse {
  newForecast: number;
  remainingGap: number;
  hitProbability: number;
  incrementalImpact: number;
  explanation: string;
}

export async function runSimulate(req: SimulateRequest): Promise<SimulateResponse | null> {
  return postJson<SimulateResponse>('/api/simulate', req);
}
