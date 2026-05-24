/**
 * Single source of truth for the May 2026 demo.
 *
 * All monetary values are in GBP (£).
 * All sections, hooks, and the backend use these constants so nothing contradicts.
 *
 * If the API returns real numbers, those take priority — these are the fallback
 * values used when the backend is down or the CSV files are absent.
 */

export const DEMO_MONTH = '2026-05';
export const DEMO_MONTH_LABEL = 'May 2026';
export const DEMO_MARKET = 'UK';

// ── Revenue targets (demo planning targets — no real budget file available) ──
export const DEMO_MONTHLY_TARGET_GBP = 1_200_000;
export const DEMO_WEEKLY_TARGET_GBP = Math.round(DEMO_MONTHLY_TARGET_GBP / 4.33); // ~277,000
export const DEMO_QUARTERLY_TARGET_GBP = DEMO_MONTHLY_TARGET_GBP * 3; // 3,600,000
export const DEMO_ANNUAL_TARGET_GBP = DEMO_MONTHLY_TARGET_GBP * 12; // 14,400,000

// ── Forecast & gap ────────────────────────────────────────────────────────────
export const DEMO_BASELINE_FORECAST_GBP = 1_080_000;
export const DEMO_SALES_TO_DATE_GBP = 742_000;
export const DEMO_EXPECTED_GAP_GBP = DEMO_BASELINE_FORECAST_GBP - DEMO_MONTHLY_TARGET_GBP; // -120,000
export const DEMO_HIT_PROBABILITY = 34;
export const DEMO_STATUS = 'At Risk' as const;

// ── Balanced recovery plan (used for gap bridge waterfall) ────────────────────
export const DEMO_BALANCED_IMPACT_GBP = 136_000;
export const DEMO_BALANCED_FORECAST_GBP = DEMO_BASELINE_FORECAST_GBP + DEMO_BALANCED_IMPACT_GBP; // 1,216,000
export const DEMO_BALANCED_HIT_PROBABILITY = 74;

// ── Revenue conversion ────────────────────────────────────────────────────────
// Used when converting Hl forecasts to £. Derived from weekly_features.csv:
//   total_rev / total_hl ≈ £228/Hl (see backend/app/services/forecast.py)
export const DEMO_REVENUE_PER_HL_GBP = 228;
