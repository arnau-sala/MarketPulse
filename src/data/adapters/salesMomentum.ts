import type {
  BackendForecastPoint,
  BackendWeeklyForecastPayload,
  BackendWeeklyForecastRow,
} from '../../types/backend';
import type {
  SalesMomentumData,
  SalesMomentumPeriod,
  SalesMomentumPoint,
} from '../../types';

/**
 * Conversion fallback used when the analytics snapshot has volumes in
 * hectoliters but no `revenuePerHlGbp` meta. Matches the backend default
 * in `backend/app/services/forecast.py`.
 */
const DEFAULT_REVENUE_PER_HL_GBP = 228;

/**
 * Multiplier applied to no-action forecasts to produce a placeholder
 * "recommended plan" curve. Replace once the planner endpoint is wired.
 */
const RECOMMENDED_PLAN_UPLIFT = 1.08;

interface NormalisedPoint {
  /** ISO date (YYYY-MM-DD) at the start of the weekly bucket. */
  date: Date;
  /** True when the row represents a realised week (actuals known). */
  isHistorical: boolean;
  /** Realised revenue (£), or null for future buckets. */
  actualGbp: number | null;
  /** Model forecast (£), or null for historical buckets. */
  forecastGbp: number | null;
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? new Date(NaN) : date;
}

function formatWeekLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${months[date.getUTCMonth()]} ${day}`;
}

function formatMonthLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`;
}

function getQuarter(date: Date): { key: string; label: string; index: number } {
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return { key: `${year}-Q${quarter}`, label: `Q${quarter} ${year}`, index: year * 10 + quarter };
}

function buildEmptyPeriod(target: number): SalesMomentumPeriod {
  return { target, points: [] };
}

function applyPlanUplift(noActionForecast: number | null): number | null {
  return typeof noActionForecast === 'number'
    ? Math.round(noActionForecast * RECOMMENDED_PLAN_UPLIFT)
    : null;
}

function takeRecent<T>(items: T[], maxBefore: number, maxAfter: number, pivotIndex: number): T[] {
  const start = Math.max(0, pivotIndex - maxBefore);
  const end = Math.min(items.length, pivotIndex + maxAfter + 1);
  return items.slice(start, end);
}

function pickPivotIndex(points: NormalisedPoint[]): number {
  // Pivot on the most recent historical week — that is "today" for the chart.
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].isHistorical) {
      return i;
    }
  }
  return points.length > 0 ? points.length - 1 : 0;
}

function toMomentumPoint(
  period: string,
  actualGbp: number | null,
  noActionForecast: number | null,
  target: number,
  isToday: boolean,
): SalesMomentumPoint {
  const recommended = applyPlanUplift(noActionForecast);
  const point: SalesMomentumPoint = {
    period,
    actualSales: actualGbp,
    noActionForecast,
    recommendedForecast: recommended,
    target,
  };
  if (isToday) {
    point.today = true;
  }
  return point;
}

function buildWeekly(points: NormalisedPoint[], target: number): SalesMomentumPeriod {
  if (points.length === 0) {
    return buildEmptyPeriod(target);
  }

  const pivot = pickPivotIndex(points);
  const window = takeRecent(points, 3, 4, pivot);

  return {
    target,
    points: window.map((point) => {
      const isToday = point === points[pivot];
      // For the "today" bucket we keep both actual + forecast values aligned,
      // so the recommended/no-action curves originate from the realised value.
      const noAction = isToday
        ? point.actualGbp ?? point.forecastGbp
        : point.isHistorical
          ? null
          : point.forecastGbp;
      return toMomentumPoint(
        formatWeekLabel(point.date),
        point.actualGbp,
        noAction,
        target,
        isToday,
      );
    }),
  };
}

function aggregate<TBucket>(
  points: NormalisedPoint[],
  getKey: (point: NormalisedPoint) => TBucket & { key: string; label: string; sortIndex: number },
): Array<{
  key: string;
  label: string;
  sortIndex: number;
  actualGbp: number | null;
  forecastGbp: number | null;
  hasHistorical: boolean;
  hasForecast: boolean;
}> {
  const buckets = new Map<
    string,
    {
      key: string;
      label: string;
      sortIndex: number;
      actualGbp: number;
      forecastGbp: number;
      hasHistorical: boolean;
      hasForecast: boolean;
    }
  >();

  for (const point of points) {
    const bucketKey = getKey(point);
    const existing = buckets.get(bucketKey.key) ?? {
      key: bucketKey.key,
      label: bucketKey.label,
      sortIndex: bucketKey.sortIndex,
      actualGbp: 0,
      forecastGbp: 0,
      hasHistorical: false,
      hasForecast: false,
    };

    if (typeof point.actualGbp === 'number') {
      existing.actualGbp += point.actualGbp;
      existing.hasHistorical = true;
    }
    if (typeof point.forecastGbp === 'number') {
      existing.forecastGbp += point.forecastGbp;
      existing.hasForecast = true;
    }
    buckets.set(bucketKey.key, existing);
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      sortIndex: bucket.sortIndex,
      actualGbp: bucket.hasHistorical ? Math.round(bucket.actualGbp) : null,
      forecastGbp: bucket.hasForecast ? Math.round(bucket.forecastGbp) : null,
      hasHistorical: bucket.hasHistorical,
      hasForecast: bucket.hasForecast,
    }));
}

function buildPeriodFromBuckets(
  buckets: ReturnType<typeof aggregate>,
  target: number,
  beforeCount: number,
  afterCount: number,
): SalesMomentumPeriod {
  if (buckets.length === 0) {
    return buildEmptyPeriod(target);
  }

  // "Today" = the most recent bucket with realised data.
  let pivot = -1;
  for (let i = buckets.length - 1; i >= 0; i -= 1) {
    if (buckets[i].hasHistorical) {
      pivot = i;
      break;
    }
  }
  if (pivot < 0) {
    pivot = buckets.length - 1;
  }

  const start = Math.max(0, pivot - beforeCount);
  const end = Math.min(buckets.length, pivot + afterCount + 1);
  const window = buckets.slice(start, end);

  return {
    target,
    points: window.map((bucket) => {
      const isToday = bucket === buckets[pivot];
      const noAction = isToday
        ? bucket.actualGbp ?? bucket.forecastGbp
        : bucket.hasHistorical
          ? null
          : bucket.forecastGbp;
      return toMomentumPoint(bucket.label, bucket.actualGbp, noAction, target, isToday);
    }),
  };
}

function buildMonthly(points: NormalisedPoint[], target: number): SalesMomentumPeriod {
  const buckets = aggregate(points, (point) => {
    const year = point.date.getUTCFullYear();
    const month = point.date.getUTCMonth();
    return {
      key: `${year}-${month}`,
      label: formatMonthLabel(point.date),
      sortIndex: year * 12 + month,
    };
  });
  return buildPeriodFromBuckets(buckets, target, 3, 2);
}

function buildQuarterly(points: NormalisedPoint[], target: number): SalesMomentumPeriod {
  const buckets = aggregate(points, (point) => {
    const q = getQuarter(point.date);
    return { key: q.key, label: q.label, sortIndex: q.index };
  });
  return buildPeriodFromBuckets(buckets, target, 3, 2);
}

function buildYearly(points: NormalisedPoint[], target: number): SalesMomentumPeriod {
  const buckets = aggregate(points, (point) => {
    const year = point.date.getUTCFullYear();
    return { key: `${year}`, label: `${year}`, sortIndex: year };
  });
  return buildPeriodFromBuckets(buckets, target, 3, 1);
}

interface BuildOptions {
  /** Target used as a placeholder; the chart overrides this from TargetContext. */
  fallbackWeeklyTarget?: number;
  fallbackMonthlyTarget?: number;
  fallbackQuarterlyTarget?: number;
  fallbackAnnualTarget?: number;
}

function buildSalesMomentum(points: NormalisedPoint[], options: BuildOptions = {}): SalesMomentumData {
  const weeklyTarget = options.fallbackWeeklyTarget ?? 277000;
  const monthlyTarget = options.fallbackMonthlyTarget ?? 1_200_000;
  const quarterlyTarget = options.fallbackQuarterlyTarget ?? 3_600_000;
  const annualTarget = options.fallbackAnnualTarget ?? 14_400_000;

  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    week: buildWeekly(sorted, weeklyTarget),
    month: buildMonthly(sorted, monthlyTarget),
    quarter: buildQuarterly(sorted, quarterlyTarget),
    year: buildYearly(sorted, annualTarget),
  };
}

// ─── Public adapters ────────────────────────────────────────────────────────

/**
 * Convert the analytics pipeline snapshot (volumes in Hl) into the frontend's
 * {@link SalesMomentumData} contract. The chart is currency-agnostic in its UI
 * formatting but expects £ values, so we apply the meta-provided rate (or a
 * documented fallback) here.
 */
export function adaptSnapshotToSalesMomentum(
  payload: BackendWeeklyForecastPayload,
  options: BuildOptions = {},
): SalesMomentumData {
  const revenuePerHl = payload.meta?.revenuePerHlGbp ?? DEFAULT_REVENUE_PER_HL_GBP;

  const normalised: NormalisedPoint[] = payload.series
    .map((row: BackendWeeklyForecastRow) => {
      const date = parseDate(row.fecha);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      const actualHl = row.venta_real_historica;
      const forecastHl = row.prediccion_futura;
      return {
        date,
        isHistorical: row.tipo === 'historico',
        actualGbp: typeof actualHl === 'number' ? Math.round(actualHl * revenuePerHl) : null,
        forecastGbp: typeof forecastHl === 'number' ? Math.round(forecastHl * revenuePerHl) : null,
      } satisfies NormalisedPoint;
    })
    .filter((point): point is NormalisedPoint => point !== null);

  return buildSalesMomentum(normalised, options);
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Convert the live `/api/forecast` response (already £-denominated) into the
 * frontend's {@link SalesMomentumData} contract.
 *
 * The API uses display-friendly labels like "May 04" rather than ISO dates,
 * so we don't try to parse them — we synthesise chronological dates anchored
 * on "today": the last historical point becomes the current week, with each
 * neighbour ±7 days from there. That keeps month/quarter/year bucketing
 * meaningful regardless of which window the backend returns.
 */
export function adaptApiForecastToSalesMomentum(
  series: BackendForecastPoint[],
  options: BuildOptions = {},
): SalesMomentumData {
  if (series.length === 0) {
    return buildSalesMomentum([], options);
  }

  // Pivot on the last historical row; default to the last point if the API
  // returned only forecasts.
  let pivotIndex = -1;
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (typeof series[i].actual === 'number') {
      pivotIndex = i;
      break;
    }
  }
  if (pivotIndex < 0) {
    pivotIndex = series.length - 1;
  }

  const anchor = new Date();
  anchor.setUTCHours(0, 0, 0, 0);
  const anchorTime = anchor.getTime();

  const normalised: NormalisedPoint[] = series.map((point, i) => ({
    date: new Date(anchorTime + (i - pivotIndex) * WEEK_MS),
    isHistorical: typeof point.actual === 'number',
    actualGbp: typeof point.actual === 'number' ? point.actual : null,
    forecastGbp: typeof point.forecast === 'number' ? point.forecast : null,
  }));

  return buildSalesMomentum(normalised, options);
}
