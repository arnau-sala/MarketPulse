import type {
  BackendDataSource,
  BackendForecastPoint,
  BackendWeeklyForecastPayload,
} from '../../types/backend';
import type { SalesMomentumData } from '../../types';
import { salesMomentumData as mockSalesMomentumData } from '../mockData';
import {
  adaptApiForecastToSalesMomentum,
  adaptSnapshotToSalesMomentum,
} from '../adapters/salesMomentum';

/**
 * Snapshot location served by Vite from `public/forecast_results.json`.
 * Mirrors the file the analytics pipeline writes.
 */
const SNAPSHOT_URL = '/forecast_results.json';

/**
 * Request timeout for the live API. If the backend is asleep we don't want the
 * dashboard to hang — fall through to the snapshot/mock instead.
 */
const API_TIMEOUT_MS = 3000;

export interface SalesMomentumResult {
  data: SalesMomentumData;
  source: BackendDataSource;
}

interface EnvShape {
  VITE_API_BASE_URL?: string;
  VITE_FORECAST_HORIZON?: string;
}

function readEnv(): EnvShape {
  // Wrap import.meta.env in a try/catch so node-based tests (without Vite)
  // don't blow up on the global access.
  try {
    return (import.meta.env ?? {}) as EnvShape;
  } catch {
    return {};
  }
}

function buildApiUrl(): string | null {
  const env = readEnv();
  const horizon = env.VITE_FORECAST_HORIZON ?? '12';
  const base = env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
  // Empty base → relative URL, which lets the Vite dev proxy ( /api → :8000 )
  // forward the request in development.
  return `${base}/api/forecast?horizon=${encodeURIComponent(horizon)}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tryApi(): Promise<SalesMomentumData | null> {
  const url = buildApiUrl();
  if (!url) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(url, API_TIMEOUT_MS);
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as BackendForecastPoint[];
    if (!Array.isArray(payload) || payload.length === 0) {
      return null;
    }
    return adaptApiForecastToSalesMomentum(payload);
  } catch {
    return null;
  }
}

async function trySnapshot(): Promise<SalesMomentumData | null> {
  try {
    const response = await fetch(SNAPSHOT_URL);
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as BackendWeeklyForecastPayload;
    if (!payload?.series?.length) {
      return null;
    }
    return adaptSnapshotToSalesMomentum(payload);
  } catch {
    return null;
  }
}

/**
 * Loads the sales-momentum dataset with a layered strategy:
 *   1. Live FastAPI (`GET /api/forecast`) — preferred.
 *   2. Static analytics snapshot (`/forecast_results.json`) — when the API is down.
 *   3. Bundled mock — guarantees the UI keeps rendering offline.
 */
export async function loadSalesMomentumData(): Promise<SalesMomentumResult> {
  const apiData = await tryApi();
  if (apiData) {
    return { data: apiData, source: 'api' };
  }

  const snapshotData = await trySnapshot();
  if (snapshotData) {
    return { data: snapshotData, source: 'snapshot' };
  }

  return { data: mockSalesMomentumData, source: 'mock' };
}
