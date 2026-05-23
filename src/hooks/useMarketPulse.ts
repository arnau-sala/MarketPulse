/**
 * Data-fetching hooks for MarketPulse.
 *
 * Each hook initialises with the local mock as instant fallback, then
 * replaces it with real backend data. If the backend is unavailable the
 * UI continues working with the mocks — no blank screens, no crashes.
 */
import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import {
  monthlyMetrics,
  forecastSeries,
  gapDrivers,
  demandWindows,
  actionPlans,
  channelPerformance,
  brandPerformance,
} from '../data/mockData';
import type {
  MonthlyMetrics,
  GapDriver,
  DemandWindow,
  ActionPlan,
  ChannelPerformance,
  BrandPerformance,
} from '../types';
import type { ForecastPoint } from '../types';

// ─── Generic hook ─────────────────────────────────────────────────────────────

function useApiData<T>(
  fetchFn: () => Promise<T>,
  initial: T,
): { data: T; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFn()
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { return run(); }, [run]);

  return { data, loading, error, refetch: run };
}

// ─── Typed hooks ──────────────────────────────────────────────────────────────

export function useMetrics() {
  return useApiData<MonthlyMetrics>(
    () => api.getMetrics(),
    monthlyMetrics,
  );
}

export function useForecast() {
  return useApiData<ForecastPoint[]>(
    () => api.getForecast(13),
    forecastSeries,
  );
}

export function useGapDrivers() {
  return useApiData<GapDriver[]>(
    () => api.getGapDrivers(),
    gapDrivers,
  );
}

export function useDemandWindows() {
  return useApiData<DemandWindow[]>(
    () => api.getDemandWindows(),
    demandWindows,
  );
}

export function useActionPlans() {
  return useApiData<ActionPlan[]>(
    () => api.getActionPlans(),
    actionPlans,
  );
}

export function useChannelPerformance() {
  return useApiData<ChannelPerformance[]>(
    () => api.getChannelPerformance(),
    channelPerformance,
  );
}

export function useBrandPerformance() {
  return useApiData<BrandPerformance[]>(
    () => api.getBrandPerformance(),
    brandPerformance,
  );
}

// ─── Backend health ───────────────────────────────────────────────────────────

export function useBackendStatus() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    api.checkHealth().then(setOnline);
  }, []);
  return online;
}
