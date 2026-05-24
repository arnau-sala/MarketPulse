import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { formatCurrency, formatDelta, formatPercent } from '../../utils/formatters';
import { useTargetPlan } from '../../context/TargetContext';
import { useSalesMomentumData } from '../../hooks/useSalesMomentumData';
import type { SalesMomentumPeriod } from '../../types';

const periodOptions = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
] as const;

type PeriodKey = (typeof periodOptions)[number]['value'];

type MomentumPeriod = SalesMomentumPeriod;
type MomentumPoint = MomentumPeriod['points'][number];

type HoverMode = 'none' | 'actual' | 'future';

const lineLabels = [
  { key: 'actualSales', label: 'Actual sales', color: '#0F172A', strokeWidth: 2.75 },
  { key: 'recommendedForecast', label: 'Recommended plan forecast', color: '#16A34A', strokeWidth: 2.75 },
] as const;

const chartLegendItems = [
  { label: 'Actual sales', color: '#0F172A', dash: false },
  { label: 'No-action forecast', color: '#F59E0B', dash: true },
  { label: 'Recommended plan forecast', color: '#16A34A', dash: false },
  { label: 'Target', color: '#DC2626', dash: false },
] as const;

function formatAxis(value: number) {
  return formatCurrency(value, true);
}

function renderTargetReferenceLabel(targetValue: number) {
  return (props: { viewBox?: { x?: number; y?: number; width?: number } }) => {
    const { viewBox } = props;
    if (viewBox?.x == null || viewBox?.y == null || viewBox?.width == null) {
      return <g />;
    }

    const x = viewBox.x + 6;
    const y = Math.max(14, viewBox.y - 10);

    return (
      <text x={x} y={y} textAnchor="start" fill="#DC2626" fontSize={11} fontWeight={600}>
        {formatCurrency(targetValue, true)}
      </text>
    );
  };
}

function HoverInfoPanel({
  hoveredPoint,
  hoverMode,
}: {
  hoveredPoint: MomentumPoint | null;
  hoverMode: HoverMode;
}) {
  const label = hoveredPoint?.period ?? '';
  const noActionValue = hoveredPoint?.noActionForecast ?? null;
  const recommendedValue = hoveredPoint?.recommendedForecast ?? null;
  const actualValue = hoveredPoint?.actualSales ?? null;
  const gain = typeof noActionValue === 'number' && typeof recommendedValue === 'number'
    ? recommendedValue - noActionValue
    : null;

  return (
    <div className="h-[149px] rounded-xl border border-ink-200 bg-cream-50/80 px-4 py-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      {hoverMode === 'none' || !hoveredPoint ? (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-ink-200 bg-white px-4 text-center text-[12px] text-ink-500">
          Hover the chart to inspect
        </div>
      ) : hoverMode === 'actual' ? (
        <div className="flex h-full flex-col">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[12px] font-semibold text-ink-900">{label}</p>
            <span className="rounded-full border border-ink-200 bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
              Actual selected
            </span>
          </div>
          <div className="flex flex-1 items-center">
            <div className="w-full rounded-xl border border-ink-200 bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Actual sales</p>
              <p className="mt-2 text-[20px] font-bold leading-none text-ink-900">
                {formatCurrency(actualValue ?? 0, true)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[12px] font-semibold text-ink-900">{label}</p>
            {gain != null && (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${gain >= 0 ? 'border-success/20 bg-success-light/40 text-success' : 'border-danger/20 bg-danger-light/40 text-danger'}`}>
                Potential gain: {formatDelta(gain)}
              </span>
            )}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3">
            <div className="flex h-full flex-col rounded-xl border border-ink-200 bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-warning">No action</p>
              <p className="mt-2 text-[20px] font-bold leading-none text-warning">{formatCurrency(noActionValue ?? 0, true)}</p>
            </div>
            <div className="flex h-full flex-col rounded-xl border border-success/20 bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-success">Recommended</p>
              <p className="mt-2 text-[20px] font-bold leading-none text-success">{formatCurrency(recommendedValue ?? 0, true)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  badge,
  badgeTone = 'neutral',
  markerClass,
  compact = false,
}: {
  label: string;
  value: number | null | undefined;
  badge: string;
  badgeTone?: 'neutral' | 'success' | 'warning' | 'danger';
  markerClass: string;
  compact?: boolean;
}) {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;

  const toneClass =
    badgeTone === 'success'
      ? 'text-success bg-success-light/70 border-success/20'
      : badgeTone === 'warning'
        ? 'text-warning bg-warning-light/70 border-warning/20'
        : badgeTone === 'danger'
          ? 'text-danger bg-danger-light/70 border-danger/20'
          : 'text-ink-700 bg-ink-100 border-ink-200';

  return (
    <div className={`rounded-xl border border-ink-200 bg-cream-100/70 ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
      <div className="mb-2 flex items-start gap-2">
        <span className={`mt-1 h-6 w-1.5 rounded-full ${markerClass}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
          <p className={`mt-1 font-bold leading-none text-ink-900 ${compact ? 'text-[18px]' : 'text-[20px]'}`}>{formatCurrency(safeValue, true)}</p>
        </div>
      </div>
      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneClass}`}>
        {badge}
      </span>
    </div>
  );
}

function getTodayPoint(periodData: MomentumPeriod) {
  return periodData.points.find((point) => point.today) ?? periodData.points[0];
}

function getClosePoint(periodData: MomentumPeriod) {
  return periodData.points[periodData.points.length - 1];
}

function getForecastGapPoint(point: MomentumPoint) {
  if (typeof point.noActionForecast !== 'number' || typeof point.recommendedForecast !== 'number') {
    return null;
  }

  return Math.max(point.recommendedForecast - point.noActionForecast, 0);
}

function getYAxisDomain(periodData: MomentumPeriod, lineTarget: number): [number, number] {
  const values = periodData.points.flatMap((point) => [
    point.actualSales,
    point.noActionForecast,
    point.recommendedForecast,
    lineTarget,
  ]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, max * 0.08);
  const lower = Math.max(0, Math.round((min - span * 0.12) / 10000) * 10000);
  const upper = Math.round((max + span * 0.08) / 10000) * 10000;

  return [lower, upper];
}

const CHART_ANIMATION_MS = 1400;

export default function SalesMomentumChart() {
  const { data: salesMomentumData } = useSalesMomentumData();
  const { currentMonthTarget, quarterlyTarget: currentQuarterTarget, weeklyTarget, annualTarget } = useTargetPlan();
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartAnimationActive, setChartAnimationActive] = useState(true);
  const selectedPeriodData = salesMomentumData[period];
  const periodTarget =
    period === 'week'
      ? weeklyTarget
      : period === 'month'
        ? currentMonthTarget
        : period === 'quarter'
          ? currentQuarterTarget
          : annualTarget;
  const data = selectedPeriodData.points.map((point) => ({
    ...point,
    target: periodTarget,
    forecastGap: getForecastGapPoint(point),
  }));
  const todayIndex = selectedPeriodData.points.findIndex((point) => point.today);
  const todayPoint = getTodayPoint(selectedPeriodData);
  const finalPoint = getClosePoint(selectedPeriodData);
  const target = periodTarget;
  const yDomain = getYAxisDomain(selectedPeriodData, periodTarget);
  // Create evenly spaced ticks for the Y axis so labels remain uniformly distributed
  const yTicks = (() => {
    const [low, up] = yDomain;
    const steps = 4; // produce 5 labels (including endpoints)
    if (!Number.isFinite(low) || !Number.isFinite(up) || up <= low) return undefined;
    const step = (up - low) / steps;
    return Array.from({ length: steps + 1 }, (_, i) => Math.round((low + step * i) / 1000) * 1000);
  })();
  const salesToDate = todayPoint.actualSales ?? 0;
  const noActionClose = finalPoint.noActionForecast ?? 0;
  const recommendedClose = finalPoint.recommendedForecast ?? 0;
  const salesProgressPct = target > 0 ? (salesToDate / target) * 100 : 0;
  const noActionGap = noActionClose - target;
  const recommendedGap = recommendedClose - target;
  const uplift = recommendedClose - noActionClose;

  const handlePeriodChange = (nextPeriod: PeriodKey) => {
    if (nextPeriod === period) {
      return;
    }

    setHoveredIndex(null);
    setChartAnimationActive(true);
    setPeriod(nextPeriod);
  };

  useEffect(() => {
    if (!chartAnimationActive) {
      return;
    }

    const timer = window.setTimeout(() => setChartAnimationActive(false), CHART_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [period, chartAnimationActive]);

  const hoveredPoint = hoveredIndex != null ? data[hoveredIndex] ?? null : null;
  let hoverMode: HoverMode = 'none';
  if (hoveredIndex !== null && hoveredIndex !== undefined) {
    hoverMode = hoveredIndex <= todayIndex ? 'actual' : 'future';
  }

  const stats: {
    label: string;
    value: number | null | undefined;
    badge: string;
    badgeTone?: 'neutral' | 'success' | 'warning' | 'danger';
    markerClass: string;
  }[] = [
    {
      label: 'Sales to date',
      value: salesToDate,
      badge: `${formatPercent(salesProgressPct, 0)} achieved`,
      badgeTone: salesProgressPct >= 100 ? 'success' : salesProgressPct >= 70 ? 'neutral' : 'warning',
      markerClass: 'bg-ink-900',
    },
    {
      label: 'Period target',
      value: target,
      badge: 'Fixed goal',
      badgeTone: 'neutral',
      markerClass: 'bg-brand-red',
    },
    {
      label: 'No-action close',
      value: noActionClose,
      badge: `${formatDelta(noActionGap)} vs target`,
      badgeTone: noActionGap >= 0 ? 'success' : 'danger',
      markerClass: 'bg-warning',
    },
    {
      label: 'Recommended close',
      value: recommendedClose,
      badge: `${formatDelta(recommendedGap)} vs target`,
      badgeTone: recommendedGap >= 0 ? 'success' : 'danger',
      markerClass: 'bg-success',
    },
  ];

  return (
    <div className="rounded-2xl border border-ink-300/60 bg-white px-5 py-5 shadow-card">
      <div className="flex flex-col gap-4 border-b border-ink-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-ink-900">Closing Trajectory</p>
          <p className="mt-1 text-[12px] text-ink-500">See how the expected close changes if the recommended plan is activated.</p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end" role="group" aria-label="Select chart period">
          {periodOptions.map((option) => {
            const isActive = period === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => handlePeriodChange(option.value)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-150 ${
                  isActive
                    ? 'border-ink-900 bg-ink-900 text-white shadow-sm'
                    : 'border-ink-300/70 bg-white text-ink-600 hover:border-ink-500 hover:text-ink-900'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)] xl:items-stretch">
        <div className="flex h-full flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
          {stats.map((stat) => (
            <StatBlock
              key={stat.label}
              label={stat.label}
              value={stat.value}
              badge={stat.badge}
              badgeTone={stat.badgeTone}
              markerClass={stat.markerClass}
              compact
            />
          ))}
          </div>

          <div className="min-h-0 flex-1">
            <HoverInfoPanel hoveredPoint={hoveredPoint} hoverMode={hoverMode} />
          </div>
        </div>

        <div className="min-w-0">
          <div
            className="rounded-xl border border-ink-200 bg-white px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
              const index = Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1))));
              const hoveredPoint = data[index];

              if (!hoveredPoint) {
                setHoveredIndex(null);
                return;
              }

              setHoveredIndex(index);
            }}
            onMouseLeave={() => {
              setHoveredIndex(null);
            }}
          >
            <div className="mb-3 flex justify-center">
              <div className="inline-flex items-center gap-3 rounded-md border border-ink-200 bg-white px-3 py-1 text-[11px] text-ink-500">
                {chartLegendItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span
                      className={`h-0 w-4 border-t-2 ${item.dash ? 'border-dashed' : 'border-solid'}`}
                      style={{ borderColor: item.color }}
                    />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  key={period}
                  data={data}
                  margin={{ top: 14, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  {/* Target reference line: drawn early so it stays behind areas/lines */}
                  <ReferenceLine
                    y={target}
                    stroke="#DC2626"
                    strokeWidth={1}
                    strokeOpacity={0.9}
                    label={renderTargetReferenceLabel(target)}
                  />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={formatAxis}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={58}
                    domain={yDomain}
                    ticks={yTicks}
                    allowDataOverflow
                  />
                  {hoveredIndex != null && data[hoveredIndex] && (
                    <ReferenceLine
                      x={data[hoveredIndex].period}
                      stroke="#94A3B8"
                      strokeOpacity={0.32}
                      strokeWidth={1}
                      strokeDasharray="2 5"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="noActionForecast"
                    name="No-action forecast"
                    stackId="fork"
                    isAnimationActive={chartAnimationActive}
                    animationDuration={CHART_ANIMATION_MS}
                    stroke="#F59E0B"
                    strokeWidth={2.25}
                    strokeDasharray="6 4"
                    fill="transparent"
                    dot={(props: any) => (
                        hoverMode === 'future' && props.index === hoveredIndex && typeof props.cx === 'number' && typeof props.cy === 'number'
                          ? <circle key={`hover-dot-noaction-${props.index ?? 0}`} cx={props.cx} cy={props.cy} r={4.5} fill="#F59E0B" stroke="white" strokeWidth={1.5} />
                          : <g />
                      )}
                    activeDot={false}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="forecastGap"
                    name="Forecast uplift"
                    stackId="fork"
                    isAnimationActive={chartAnimationActive}
                    animationDuration={CHART_ANIMATION_MS}
                    stroke="none"
                    fill="#16A34A"
                    fillOpacity={0.16}
                    dot={(props: any) => (
                      hoverMode === 'future' && props.index === hoveredIndex && typeof props.cx === 'number' && typeof props.cy === 'number'
                        ? <circle key={`hover-dot-gap-${props.index ?? 0}`} cx={props.cx} cy={props.cy} r={4.5} fill="#16A34A" stroke="white" strokeWidth={1.5} />
                        : <g />
                    )}
                    activeDot={false}
                    connectNulls={false}
                    legendType="none"
                  />
                  {lineLabels.map((line) => (
                    <Line
                      key={line.key}
                      type="monotone"
                      dataKey={line.key}
                      name={line.label}
                      isAnimationActive={chartAnimationActive}
                      animationDuration={CHART_ANIMATION_MS}
                      stroke={line.color}
                      strokeWidth={line.strokeWidth}
                      dot={(props: any) => (
                        hoverMode === 'actual' && line.key === 'actualSales' && props.index === hoveredIndex && typeof props.cx === 'number' && typeof props.cy === 'number'
                          ? <circle key={`hover-dot-${line.key}-${props.index ?? 0}`} cx={props.cx} cy={props.cy} r={4.5} fill={line.color} stroke="white" strokeWidth={1.5} />
                            : <g />
                        )}
                      activeDot={false}
                      connectNulls={false}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-[11px] text-ink-500">
        <span>Selected period: {periodOptions.find((option) => option.value === period)?.label} · Target {formatCurrency(target, true)}</span>
        <span>
          No-action gap: {formatCurrency(noActionGap, true)} · Recovery uplift: {formatCurrency(uplift, true)} ({formatPercent((uplift / (noActionClose || 1)) * 100, 0)})
        </span>
      </div>
    </div>
  );
}