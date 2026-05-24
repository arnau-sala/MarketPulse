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
import { netProfitHistory } from '../profitHistory';

/**
 * Conversion fallback used when the analytics snapshot has volumes in
 * hectoliters but no `revenuePerHlGbp` meta and no historical calibration.
 */
const DEFAULT_REVENUE_PER_HL_GBP = 44;

/**
 * Multiplier applied to no-action forecast increments to produce a placeholder
 * "recommended plan" curve. API-provided action forecasts take precedence.
 */
const RECOMMENDED_PLAN_UPLIFT = 1.08;

interface NormalisedPoint {
  date: Date;
  isHistorical: boolean;
  actualGbp: number | null;
  forecastGbp: number | null;
  recommendedGbp: number | null;
}

interface TimelinePoint {
  label: string;
  actualSales: number | null;
  noActionForecast: number | null;
  recommendedForecast: number | null;
  today?: boolean;
}

interface Bucket {
  key: string;
  label: string;
  sortIndex: number;
  actualGbp: number | null;
  forecastGbp: number | null;
  recommendedGbp: number | null;
  hasHistorical: boolean;
  hasForecast: boolean;
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? new Date(NaN) : date;
}

function monthKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

function deriveRevenuePerHl(payload: BackendWeeklyForecastPayload): number {
  if (typeof payload.meta?.revenuePerHlGbp === 'number') {
    return payload.meta.revenuePerHlGbp;
  }

  const profitByMonth = new Map<string, number>();
  for (const year of netProfitHistory) {
    for (const month of year.months) {
      profitByMonth.set(`${year.year}-${String(month.monthNumber).padStart(2, '0')}`, month.netProfitGbp);
    }
  }

  const volumeByMonth = new Map<string, number>();
  for (const row of payload.series) {
    if (row.tipo !== 'historico' || typeof row.venta_real_historica !== 'number') {
      continue;
    }

    const date = parseDate(row.fecha);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const key = monthKey(date);
    volumeByMonth.set(key, (volumeByMonth.get(key) ?? 0) + row.venta_real_historica);
  }

  let totalProfit = 0;
  let totalVolume = 0;
  for (const [key, volume] of volumeByMonth) {
    const profit = profitByMonth.get(key);
    if (typeof profit === 'number' && volume > 0) {
      totalProfit += profit;
      totalVolume += volume;
    }
  }

  return totalVolume > 0 ? totalProfit / totalVolume : DEFAULT_REVENUE_PER_HL_GBP;
}

function parseApiForecastDate(value: string, fallback: Date): Date {
  const match = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(value.trim());
  if (!match) {
    return fallback;
  }

  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    .findIndex((label) => label.toLowerCase() === match[1].toLowerCase());
  if (month < 0) {
    return fallback;
  }

  const year = new Date().getUTCFullYear();
  return new Date(Date.UTC(year, month, Number(match[2])));
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

function applyPlanUplift(noActionIncrement: number | null): number | null {
  return typeof noActionIncrement === 'number'
    ? Math.round(noActionIncrement * RECOMMENDED_PLAN_UPLIFT)
    : null;
}

function positiveValue(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function takeRecent<T>(items: T[], maxBefore: number, maxAfter: number, pivotIndex: number): T[] {
  const start = Math.max(0, pivotIndex - maxBefore);
  const end = Math.min(items.length, pivotIndex + maxAfter + 1);
  return items.slice(start, end);
}

function toMomentumPoint(point: TimelinePoint, target: number): SalesMomentumPoint {
  return {
    period: point.label,
    actualSales: point.actualSales,
    noActionForecast: point.noActionForecast,
    recommendedForecast: point.recommendedForecast,
    target,
    ...(point.today ? { today: true } : {}),
  };
}

function markToday(points: TimelinePoint[]): TimelinePoint[] {
  let todayIndex = -1;

  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (typeof points[i].actualSales === 'number') {
      todayIndex = i;
      break;
    }
  }

  return points.map((point, index) => {
    if (index !== todayIndex) {
      return { ...point, today: false };
    }

    return {
      ...point,
      today: true,
      noActionForecast: point.actualSales,
      recommendedForecast: point.actualSales,
    };
  });
}

function buildWeeklyTimeline(points: NormalisedPoint[]): TimelinePoint[] {
  let actualCumulative = 0;
  let noActionCumulative = 0;
  let recommendedCumulative = 0;

  const timeline = points.map((point) => {
    if (point.isHistorical) {
      actualCumulative += positiveValue(point.actualGbp);
      noActionCumulative = actualCumulative;
      recommendedCumulative = actualCumulative;

      return {
        label: formatWeekLabel(point.date),
        actualSales: Math.round(actualCumulative),
        noActionForecast: null,
        recommendedForecast: null,
      };
    }

    const forecastIncrement = positiveValue(point.forecastGbp);
    const recommendedIncrement = positiveValue(point.recommendedGbp ?? applyPlanUplift(forecastIncrement));
    noActionCumulative += forecastIncrement;
    recommendedCumulative += recommendedIncrement;

    return {
      label: formatWeekLabel(point.date),
      actualSales: null,
      noActionForecast: Math.round(noActionCumulative),
      recommendedForecast: Math.round(recommendedCumulative),
    };
  });

  return markToday(timeline);
}

function buildWeekly(points: NormalisedPoint[], target: number): SalesMomentumPeriod {
  if (points.length === 0) {
    return buildEmptyPeriod(target);
  }

  let pivot = -1;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].isHistorical) {
      pivot = i;
      break;
    }
  }

  const windowPoints = takeRecent(points, 3, 4, pivot >= 0 ? pivot : points.length - 1);
  const timeline = buildWeeklyTimeline(windowPoints);

  return {
    target,
    points: timeline.map((point) => toMomentumPoint(point, target)),
  };
}

function aggregate<TBucket>(
  points: NormalisedPoint[],
  getKey: (point: NormalisedPoint) => TBucket & { key: string; label: string; sortIndex: number },
): Bucket[] {
  const buckets = new Map<
    string,
    {
      key: string;
      label: string;
      sortIndex: number;
      actualGbp: number;
      forecastGbp: number;
      recommendedGbp: number;
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
      recommendedGbp: 0,
      hasHistorical: false,
      hasForecast: false,
    };

    if (typeof point.actualGbp === 'number') {
      existing.actualGbp += point.actualGbp;
      existing.hasHistorical = true;
    }

    if (typeof point.forecastGbp === 'number') {
      existing.forecastGbp += point.forecastGbp;
      existing.recommendedGbp += point.recommendedGbp ?? applyPlanUplift(point.forecastGbp) ?? point.forecastGbp;
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
      recommendedGbp: bucket.hasForecast ? Math.round(bucket.recommendedGbp) : null,
      hasHistorical: bucket.hasHistorical,
      hasForecast: bucket.hasForecast,
    }));
}

function buildBucketTimeline(buckets: Bucket[]): TimelinePoint[] {
  let actualCumulative = 0;
  let noActionCumulative = 0;
  let recommendedCumulative = 0;
  const timeline: TimelinePoint[] = [];

  for (const bucket of buckets) {
    if (bucket.hasHistorical) {
      actualCumulative += positiveValue(bucket.actualGbp);
      noActionCumulative = actualCumulative;
      recommendedCumulative = actualCumulative;
      timeline.push({
        label: bucket.hasForecast ? `${bucket.label} TD` : bucket.label,
        actualSales: Math.round(actualCumulative),
        noActionForecast: null,
        recommendedForecast: null,
      });
    }

    if (bucket.hasForecast) {
      noActionCumulative += positiveValue(bucket.forecastGbp);
      recommendedCumulative += positiveValue(bucket.recommendedGbp ?? applyPlanUplift(bucket.forecastGbp));
      timeline.push({
        label: bucket.hasHistorical ? `${bucket.label} Close` : bucket.label,
        actualSales: null,
        noActionForecast: Math.round(noActionCumulative),
        recommendedForecast: Math.round(recommendedCumulative),
      });
    }
  }

  return markToday(timeline);
}

function buildPeriodFromBuckets(
  buckets: Bucket[],
  target: number,
  beforeCount: number,
  afterCount: number,
): SalesMomentumPeriod {
  if (buckets.length === 0) {
    return buildEmptyPeriod(target);
  }

  let pivot = -1;
  for (let i = buckets.length - 1; i >= 0; i -= 1) {
    if (buckets[i].hasHistorical) {
      pivot = i;
      break;
    }
  }

  const windowBuckets = takeRecent(buckets, beforeCount, afterCount, pivot >= 0 ? pivot : buckets.length - 1);
  const timeline = buildBucketTimeline(windowBuckets);

  return {
    target,
    points: timeline.map((point) => toMomentumPoint(point, target)),
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

/**
 * Convert the analytics pipeline snapshot (volumes in Hl) into the frontend's
 * SalesMomentumData contract. Snapshot rows are weekly increments, so the
 * cumulative timeline is built from the exact row-level actual/forecast values.
 */
export function adaptSnapshotToSalesMomentum(
  payload: BackendWeeklyForecastPayload,
  options: BuildOptions = {},
): SalesMomentumData {
  const revenuePerHl = deriveRevenuePerHl(payload);

  const normalised: NormalisedPoint[] = payload.series
    .map((row: BackendWeeklyForecastRow): NormalisedPoint | null => {
      const date = parseDate(row.fecha);
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      const actualHl = row.venta_real_historica;
      const forecastHl = row.prediccion_futura;
      const isHistorical = row.tipo === 'historico';

      return {
        date,
        isHistorical,
        actualGbp: isHistorical && typeof actualHl === 'number' ? Math.round(actualHl * revenuePerHl) : null,
        forecastGbp: !isHistorical && typeof forecastHl === 'number' ? Math.round(forecastHl * revenuePerHl) : null,
        recommendedGbp: null,
      } satisfies NormalisedPoint;
    })
    .filter((point): point is NormalisedPoint => point !== null);

  return buildSalesMomentum(normalised, options);
}

/**
 * Convert the live `/api/forecast` response into the frontend's cumulative
 * SalesMomentumData contract. The API forecast is already cumulative within
 * the active month, so we first difference it into weekly increments and then
 * build one cumulative timeline from those increments.
 */
export function adaptApiForecastToSalesMomentum(
  series: BackendForecastPoint[],
  options: BuildOptions = {},
): SalesMomentumData {
  if (series.length === 0) {
    return buildSalesMomentum([], options);
  }

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

  let previousNoActionCumulative = 0;
  let previousRecommendedCumulative = 0;

  const normalised: NormalisedPoint[] = series.map((point, i) => {
    const fallbackDate = new Date();
    fallbackDate.setUTCHours(0, 0, 0, 0);
    fallbackDate.setUTCDate(fallbackDate.getUTCDate() + (i - pivotIndex) * 7);
    const isHistorical = typeof point.actual === 'number';
    const noActionCumulative = isHistorical
      ? point.actual ?? previousNoActionCumulative
      : point.forecast ?? previousNoActionCumulative;
    const forecastIncrement = !isHistorical
      ? noActionCumulative - previousNoActionCumulative
      : null;
    const recommendedCumulative = isHistorical
      ? noActionCumulative
      : point.actionForecast ??
        previousRecommendedCumulative + (applyPlanUplift(forecastIncrement) ?? positiveValue(forecastIncrement));

    const normalisedPoint: NormalisedPoint = {
      date: parseApiForecastDate(point.date, fallbackDate),
      isHistorical,
      actualGbp: isHistorical ? noActionCumulative - previousNoActionCumulative : null,
      forecastGbp: forecastIncrement,
      recommendedGbp: !isHistorical ? recommendedCumulative - previousRecommendedCumulative : null,
    };

    previousNoActionCumulative = noActionCumulative;
    previousRecommendedCumulative = recommendedCumulative;

    return normalisedPoint;
  });

  return buildSalesMomentum(normalised, options);
}
