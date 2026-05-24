import type { BackendForecastPoint } from '../../types/backend';
import type { SalesMomentumData, SalesMomentumPeriod, SalesMomentumPoint } from '../../types';
import {
  TARGET_PLANNING_YEAR,
  getMonthlyNetProfit,
  getNetProfitYear,
} from '../profitHistory';

/** Matches TargetContext current month (Mar). */
const CURRENT_PLANNING_MONTH = 3;

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const QUARTER_FUTURE_LABELS = ['Apr', 'May', 'Jun'] as const;

export interface ForecastAdapterOptions {
  planningYear?: number;
  planningMonth?: number;
  /** Applied when backend rows omit actionForecast (see backend forecast service). */
  actionUpliftRatio?: number;
}

const DEFAULT_ACTION_UPLIFT_RATIO = 1.15;

function lastActualIndex(points: BackendForecastPoint[]): number {
  let index = 0;

  for (let i = 0; i < points.length; i += 1) {
    if (points[i].actual != null) {
      index = i;
    }
  }

  return index;
}

function withRecommendedFallback(
  forecast: number | null,
  actionForecast: number | null,
  ratio: number,
): number | null {
  if (typeof actionForecast === 'number') {
    return actionForecast;
  }

  if (typeof forecast === 'number') {
    return Math.round(forecast * ratio);
  }

  return null;
}

function mapMonthPeriod(
  points: BackendForecastPoint[],
  actionUpliftRatio: number,
): SalesMomentumPeriod {
  if (points.length === 0) {
    return { target: 0, points: [] };
  }

  const monthlyTarget = points[points.length - 1]?.target ?? points[0].target;
  const todayIndex = lastActualIndex(points);
  const actualAtToday =
    points[todayIndex].actual ??
    points[todayIndex].forecast ??
    0;

  const mappedPoints: SalesMomentumPoint[] = points.map((point, index) => {
    const isPast = index < todayIndex;
    const isToday = index === todayIndex;
    const isFuture = index > todayIndex;
    const noAction = withRecommendedFallback(point.forecast, point.forecast, 1);
    const recommended = withRecommendedFallback(
      point.forecast,
      point.actionForecast,
      actionUpliftRatio,
    );

    return {
      period: isToday ? 'Today' : point.date,
      actualSales: isFuture ? null : point.actual ?? point.forecast,
      noActionForecast: isPast ? null : isToday ? actualAtToday : noAction,
      recommendedForecast: isPast ? null : isToday ? actualAtToday : recommended,
      target: monthlyTarget,
      today: isToday,
    };
  });

  return { target: monthlyTarget, points: mappedPoints };
}

function resamplePoints(points: SalesMomentumPoint[], count: number): SalesMomentumPoint[] {
  if (points.length === 0) {
    return [];
  }

  if (points.length <= count) {
    return points;
  }

  const step = (points.length - 1) / (count - 1);

  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = Math.min(Math.round(index * step), points.length - 1);
    return points[sourceIndex];
  });
}

function relabelPoints(
  points: SalesMomentumPoint[],
  labels: readonly string[],
  periodTarget: number,
): SalesMomentumPoint[] {
  return points.map((point, index) => ({
    ...point,
    period: point.today ? 'Today' : labels[index] ?? point.period,
    target: periodTarget,
  }));
}

function buildWeekPeriod(
  monthPeriod: SalesMomentumPeriod,
  weeklyTarget: number,
): SalesMomentumPeriod {
  const sampled = resamplePoints(monthPeriod.points, WEEK_LABELS.length);

  return {
    target: weeklyTarget,
    points: relabelPoints(sampled, WEEK_LABELS, weeklyTarget),
  };
}

function cumulativeThroughMonth(year: number, monthNumber: number): number {
  let total = 0;

  for (let month = 1; month <= monthNumber; month += 1) {
    total += getMonthlyNetProfit(year, month) ?? 0;
  }

  return total;
}

function currentQuarterMonths(planningMonth: number): number[] {
  const quarterStart = Math.floor((planningMonth - 1) / 3) * 3 + 1;
  return [quarterStart, quarterStart + 1, quarterStart + 2];
}

function buildQuarterPeriod(
  monthPeriod: SalesMomentumPeriod,
  options: ForecastAdapterOptions,
): SalesMomentumPeriod {
  const year = options.planningYear ?? TARGET_PLANNING_YEAR;
  const planningMonth = options.planningMonth ?? CURRENT_PLANNING_MONTH;
  const quarterMonths = currentQuarterMonths(planningMonth);
  const quarterTarget = monthPeriod.target * quarterMonths.length;
  const preMonthCumulative = cumulativeThroughMonth(year, planningMonth - 1);
  const todayPoint = monthPeriod.points.find((point) => point.today) ?? monthPeriod.points[monthPeriod.points.length - 1];
  const closePoint = monthPeriod.points[monthPeriod.points.length - 1];
  const monthToday = todayPoint?.actualSales ?? 0;
  const monthNoActionClose = closePoint?.noActionForecast ?? monthToday;
  const monthRecommendedClose = closePoint?.recommendedForecast ?? monthNoActionClose;
  const cumulativeToday = preMonthCumulative + monthToday;
  const quarterNoActionClose = preMonthCumulative + monthNoActionClose;
  const quarterRecommendedClose = preMonthCumulative + monthRecommendedClose;

  const monthShort = getNetProfitYear(year)?.months.find((m) => m.monthNumber === planningMonth)?.month ?? 'Mar';
  const earlyMonthActual = monthPeriod.points[Math.max(0, Math.floor(monthPeriod.points.length / 3))]?.actualSales ?? Math.round(monthToday * 0.55);

  const points: SalesMomentumPoint[] = [];

  for (const monthNumber of quarterMonths.slice(0, -1)) {
    if (monthNumber >= planningMonth) {
      break;
    }

    const monthMeta = getNetProfitYear(year)?.months.find((entry) => entry.monthNumber === monthNumber);
    points.push({
      period: monthMeta?.month ?? `M${monthNumber}`,
      actualSales: cumulativeThroughMonth(year, monthNumber),
      noActionForecast: null,
      recommendedForecast: null,
      target: quarterTarget,
    });
  }

  points.push({
    period: `${monthShort} W1`,
    actualSales: preMonthCumulative + earlyMonthActual,
    noActionForecast: null,
    recommendedForecast: null,
    target: quarterTarget,
  });

  points.push({
    period: 'Today',
    actualSales: cumulativeToday,
    noActionForecast: cumulativeToday,
    recommendedForecast: cumulativeToday,
    target: quarterTarget,
    today: true,
  });

  const futureLabels = QUARTER_FUTURE_LABELS.slice(0, Math.max(0, 3 - (planningMonth % 3 || 3) + 1));
  const futureSteps = Math.max(futureLabels.length, 2);
  const noActionStep = (quarterNoActionClose - cumulativeToday) / futureSteps;
  const recommendedStep = (quarterRecommendedClose - cumulativeToday) / futureSteps;

  futureLabels.forEach((label, index) => {
    const step = index + 1;
    points.push({
      period: label,
      actualSales: null,
      noActionForecast: Math.round(cumulativeToday + noActionStep * step),
      recommendedForecast: Math.round(cumulativeToday + recommendedStep * step),
      target: quarterTarget,
    });
  });

  if (points.length > 0) {
    const last = points[points.length - 1];
    last.noActionForecast = quarterNoActionClose;
    last.recommendedForecast = quarterRecommendedClose;
  }

  return { target: quarterTarget, points };
}

function buildYearPeriod(
  monthPeriod: SalesMomentumPeriod,
  options: ForecastAdapterOptions,
): SalesMomentumPeriod {
  const year = options.planningYear ?? TARGET_PLANNING_YEAR;
  const planningMonth = options.planningMonth ?? CURRENT_PLANNING_MONTH;
  const annualTarget = monthPeriod.target * 12;
  const ytdBeforeCurrent = cumulativeThroughMonth(year, planningMonth - 1);
  const todayPoint = monthPeriod.points.find((point) => point.today) ?? monthPeriod.points[monthPeriod.points.length - 1];
  const closePoint = monthPeriod.points[monthPeriod.points.length - 1];
  const monthToday = todayPoint?.actualSales ?? 0;
  const monthNoActionClose = closePoint?.noActionForecast ?? monthToday;
  const monthRecommendedClose = closePoint?.recommendedForecast ?? monthNoActionClose;
  const cumulativeToday = ytdBeforeCurrent + monthToday;
  const yearNoActionClose = ytdBeforeCurrent + monthNoActionClose;
  const yearRecommendedClose = ytdBeforeCurrent + monthRecommendedClose;

  const yearData = getNetProfitYear(year);
  const points: SalesMomentumPoint[] = [];

  for (let monthNumber = 1; monthNumber < planningMonth; monthNumber += 1) {
    const monthMeta = yearData?.months.find((entry) => entry.monthNumber === monthNumber);
    points.push({
      period: monthMeta?.month ?? `M${monthNumber}`,
      actualSales: cumulativeThroughMonth(year, monthNumber),
      noActionForecast: null,
      recommendedForecast: null,
      target: annualTarget,
    });
  }

  points.push({
    period: 'Today',
    actualSales: cumulativeToday,
    noActionForecast: cumulativeToday,
    recommendedForecast: cumulativeToday,
    target: annualTarget,
    today: true,
  });

  const futureLabels = ['Apr', 'May', 'Jul', 'Sep', 'Nov', 'Dec'];
  const futureSteps = futureLabels.length;
  const noActionStep = (yearNoActionClose - cumulativeToday) / futureSteps;
  const recommendedStep = (yearRecommendedClose - cumulativeToday) / futureSteps;

  futureLabels.forEach((label, index) => {
    const step = index + 1;
    points.push({
      period: label,
      actualSales: null,
      noActionForecast: Math.round(cumulativeToday + noActionStep * step),
      recommendedForecast: Math.round(cumulativeToday + recommendedStep * step),
      target: annualTarget,
    });
  });

  if (points.length > 0) {
    const last = points[points.length - 1];
    last.noActionForecast = yearNoActionClose;
    last.recommendedForecast = yearRecommendedClose;
  }

  return { target: annualTarget, points };
}

/**
 * Maps backend forecast output into the frontend Closing Trajectory contract.
 */
export function mapBackendForecastToSalesMomentum(
  points: BackendForecastPoint[],
  options: ForecastAdapterOptions = {},
): SalesMomentumData {
  const actionUpliftRatio = options.actionUpliftRatio ?? DEFAULT_ACTION_UPLIFT_RATIO;
  const month = mapMonthPeriod(points, actionUpliftRatio);
  const weeklyTarget = Math.round(month.target / 4.33);

  return {
    week: buildWeekPeriod(month, weeklyTarget),
    month,
    quarter: buildQuarterPeriod(month, options),
    year: buildYearPeriod(month, options),
  };
}
