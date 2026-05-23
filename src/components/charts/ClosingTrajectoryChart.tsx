/**
 * ClosingTrajectoryChart
 *
 * Full "Closing Trajectory" panel with:
 * - 4 KPI cards (sales to date, period target, no-action close, recommended close)
 * - Period toggle: Last 4 weeks | Month to date | Full period | Quarter
 * - Cumulative chart: actual (black) + no-action forecast (orange dashed) +
 *   recommended plan forecast (green) + shaded area between them
 * - "Today" reference line
 */

import { useState, useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { ForecastPoint } from '../../types';
import type { ActionPlan } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'fullMonth' | 'quarter';

interface ChartPoint {
  label: string;
  actual: number | null;
  // stacked area trick: forecastFloor (transparent) + upliftBand (green) = shading
  forecastFloor: number | null;
  upliftBand: number | null;
  // lines drawn on top
  forecastLine: number | null;
  recommendedLine: number | null;
}

interface Props {
  forecast: ForecastPoint[];
  recommendedPlan: ActionPlan | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `£${(v / 1_000).toFixed(0)}k`;
  return `£${v}`;
}

function fmtShort(v: number): string {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `£${(v / 1_000).toFixed(0)}k`;
  return `£${v}`;
}

/**
 * Distribute totalUplift across future weeks with a linear ramp
 * that starts from the 3rd future week (matching the Action Planner's Week 3 activation).
 */
function upliftAtStep(step: number, totalSteps: number, totalUplift: number): number {
  const activateFrom = Math.min(2, totalSteps - 1); // start at step index 2 (Week 3)
  if (step < activateFrom) return 0;
  const activeSteps = totalSteps - activateFrom;
  return totalUplift * ((step - activateFrom + 1) / activeSteps);
}

/**
 * Build cumulative chart data with no-action + recommended forecast lines.
 */
function buildChartData(
  points: ForecastPoint[],
  totalUplift: number,
): { data: ChartPoint[]; todayLabel: string | null } {
  let cumActual = 0;
  let cumForecast = 0;
  let lastActualCum = 0;
  let todayLabel: string | null = null;
  let futureIdx = 0;
  const futurePoints = points.filter(p => p.actual === null);
  const n = futurePoints.length;

  const data: ChartPoint[] = points.map(p => {
    const label = p.day;

    if (p.actual !== null) {
      cumActual += p.actual;
      lastActualCum = cumActual;
      return {
        label,
        actual: cumActual,
        forecastFloor: null,
        upliftBand: null,
        forecastLine: null,
        recommendedLine: null,
      };
    } else {
      if (todayLabel === null && futureIdx === 0) todayLabel = label;
      cumForecast += p.forecast ?? 0;
      const forecastCum = lastActualCum + cumForecast;
      const uplift = n > 0 ? upliftAtStep(futureIdx, n, totalUplift) : 0;
      const recommendedCum = forecastCum + uplift;
      futureIdx++;

      return {
        label,
        actual: null,
        forecastFloor: forecastCum,
        upliftBand: recommendedCum - forecastCum,
        forecastLine: forecastCum,
        recommendedLine: recommendedCum,
      };
    }
  });

  return { data, todayLabel };
}

/** Filter points to a time window. */
function filterByPeriod(all: ForecastPoint[], period: Period): ForecastPoint[] {
  const histPoints = all.filter(p => p.actual !== null);
  const futPoints  = all.filter(p => p.actual === null);

  switch (period) {
    case 'week':
      // 4 weeks back + 4 weeks forward — tight operational view
      return [...histPoints.slice(-4), ...futPoints.slice(0, 4)];
    case 'month':
      // ~2 months back + 8 weeks forward — month-level planning view
      return [...histPoints.slice(-8), ...futPoints.slice(0, 8)];
    case 'fullMonth':
      // ~3 months back + all forecast — default rolling quarter view
      return [...histPoints.slice(-13), ...futPoints];
    case 'quarter':
    default:
      // Full year history + all forecast — strategic overview
      return [...histPoints.slice(-52), ...futPoints];
  }
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const entries = payload.filter(p => p.value != null && p.name !== 'Area base');
  return (
    <div className="bg-white border border-ink-300/60 rounded-xl shadow-elevated px-4 py-3 text-[12px]">
      <p className="font-semibold text-ink-900 mb-1.5">{label}</p>
      {entries.map(p => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-ink-500">{p.name}:</span>
          <span className="font-semibold text-ink-900">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, subTone,
}: { label: string; value: string; sub?: string; subTone?: 'danger' | 'success' | 'neutral' }) {
  const toneClass = subTone === 'danger' ? 'text-danger bg-danger-light' :
                    subTone === 'success' ? 'text-success bg-success-light' :
                    'text-ink-500 bg-ink-100';
  return (
    <div className="bg-cream-50 border border-ink-200/60 rounded-xl px-4 py-3">
      <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-[22px] font-bold text-ink-900 leading-none">{value}</p>
      {sub && (
        <span className={`inline-block mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${toneClass}`}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week',      label: 'Últimas 4 semanas' },
  { key: 'month',     label: 'Mes actual'        },
  { key: 'fullMonth', label: 'Período completo'  },
  { key: 'quarter',   label: 'Vista trimestral'  },
];

export default function ClosingTrajectoryChart({ forecast, recommendedPlan }: Props) {
  const [period, setPeriod] = useState<Period>('fullMonth');

  const filtered = useMemo(() => filterByPeriod(forecast, period), [forecast, period]);

  // Sum of future incremental forecast values in the current view window
  const futureForecastTotal = useMemo(
    () => filtered.filter(p => p.actual === null).reduce((s, p) => s + (p.forecast ?? 0), 0),
    [filtered],
  );

  // Scale the plan's uplift proportionally to the actual future forecast total.
  // The plan's expectedImpact is calibrated to a monthly baseline; applying the same
  // percentage to the real future forecast makes the visual difference meaningful
  // regardless of how many months the current period view covers.
  const totalUplift = useMemo(() => {
    if (!recommendedPlan) return 0;
    const baselineForecastMonthly = recommendedPlan.forecastAfterAction - recommendedPlan.expectedImpact;
    if (baselineForecastMonthly <= 0) return recommendedPlan.expectedImpact;
    const upliftRatio = recommendedPlan.expectedImpact / baselineForecastMonthly;
    return futureForecastTotal * upliftRatio;
  }, [recommendedPlan, futureForecastTotal]);

  const { data, todayLabel } = useMemo(
    () => buildChartData(filtered, totalUplift),
    [filtered, totalUplift],
  );

  // ── KPI values ──────────────────────────────────────────────────────────────
  const salesToDate = useMemo(
    () => filtered.filter(p => p.actual !== null).reduce((s, p) => s + (p.actual ?? 0), 0),
    [filtered],
  );

  const periodTarget = useMemo(
    () => filtered.reduce((s, p) => s + p.target, 0),
    [filtered],
  );

  const lastPoint = data[data.length - 1];
  const noActionClose     = lastPoint?.forecastLine  ?? lastPoint?.actual ?? 0;
  const recommendedClose  = lastPoint?.recommendedLine ?? noActionClose;

  const noActionGap    = noActionClose - periodTarget;
  const recommendedGap = recommendedClose - periodTarget;
  const potentialGain  = recommendedClose - noActionClose;

  const maxY = useMemo(
    () => Math.max(
      ...data.map(d => Math.max(
        d.actual ?? 0,
        (d.forecastFloor ?? 0) + (d.upliftBand ?? 0),
        0,
      )),
      periodTarget,
    ) * 1.08,
    [data, periodTarget],
  );

  return (
    <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-5 py-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <p className="text-[15px] font-bold text-ink-900">Trayectoria de cierre</p>
          <p className="text-[12px] text-ink-500 mt-0.5">
            La <span className="text-[#D97706] font-semibold">línea naranja</span> es la previsión sin hacer nada.
            La <span className="text-[#15803D] font-semibold">línea verde</span> muestra qué pasaría si el equipo
            ejecuta el plan recomendado (activación Off-Trade en Semana 3).
          </p>
        </div>
        {/* Period toggle */}
        <div className="flex gap-1 flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors whitespace-nowrap ${
                period === p.key
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left — KPI cards */}
        <div className="lg:w-56 flex-shrink-0 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <KpiCard
              label="Ventas hasta hoy"
              value={fmtShort(salesToDate)}
              sub={`${((salesToDate / periodTarget) * 100).toFixed(0)}% del objetivo`}
              subTone="neutral"
            />
            <KpiCard
              label="Objetivo del período"
              value={fmtShort(periodTarget)}
              sub="Meta fija"
              subTone="neutral"
            />
            <KpiCard
              label="Cierre sin acciones"
              value={fmtShort(noActionClose)}
              sub={`${noActionGap >= 0 ? '+' : ''}${fmtShort(noActionGap)} vs objetivo`}
              subTone={noActionGap >= 0 ? 'success' : 'danger'}
            />
            <KpiCard
              label="Cierre con el plan"
              value={fmtShort(recommendedClose)}
              sub={`${recommendedGap >= 0 ? '+' : ''}${fmtShort(recommendedGap)} vs objetivo`}
              subTone={recommendedGap >= 0 ? 'success' : 'danger'}
            />
          </div>

          {/* Potential gain badge */}
          {potentialGain > 0 && (
            <div className="bg-success-light/60 border border-success/20 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[10px] font-bold text-success uppercase tracking-wide">Ganancia potencial</p>
              <p className="text-[18px] font-bold text-success">+{fmtShort(potentialGain)}</p>
              <p className="text-[10px] text-ink-500 mt-0.5">
                {((potentialGain / (noActionClose || 1)) * 100).toFixed(0)}% más con el plan
              </p>
            </div>
          )}
        </div>

        {/* Right — Chart */}
        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#15803D" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#15803D" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(1, Math.floor(data.length / 7))}
              />
              <YAxis
                tickFormatter={fmtShort}
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                width={52}
                domain={[0, maxY]}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Target reference line */}
              <ReferenceLine
                y={periodTarget}
                stroke="#B91C1C"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{ value: 'Objetivo', position: 'insideTopRight', fontSize: 10, fill: '#B91C1C', fontWeight: 600 }}
              />

              {/* Today marker */}
              {todayLabel && (
                <ReferenceLine
                  x={todayLabel}
                  stroke="#6B7280"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  label={{ value: 'Hoy', position: 'insideTopLeft', fontSize: 10, fill: '#6B7280' }}
                />
              )}

              {/* Shaded area between no-action and recommended */}
              {/* Trick: stack transparent floor + green upliftBand */}
              <Area
                type="monotone"
                dataKey="forecastFloor"
                stackId="shade"
                fill="transparent"
                stroke="none"
                dot={false}
                legendType="none"
                name="Area base"
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="upliftBand"
                stackId="shade"
                fill="url(#greenFill)"
                stroke="none"
                dot={false}
                legendType="none"
                name="Gain zone"
                connectNulls
              />

              {/* Lines */}
              <Line
                type="monotone"
                dataKey="actual"
                name="Ventas reales"
                stroke="#171717"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="forecastLine"
                name="Previsión sin acciones"
                stroke="#D97706"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="recommendedLine"
                name="Con plan recomendado"
                stroke="#15803D"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />

              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12, color: '#6B7280' }}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (value === 'Area base' || value === 'Gain zone') ? null : value}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Bottom info bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100">
            <p className="text-[11px] text-ink-400">
              Vista: {PERIODS.find(p => p.key === period)?.label} · Objetivo {fmtShort(periodTarget)}
            </p>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-ink-400">
                Sin acciones: <span className={noActionGap >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                  {noActionGap >= 0 ? '+' : ''}{fmtShort(noActionGap)}
                </span>
              </span>
              {potentialGain > 0 && (
                <span className="text-ink-400">
                  Ganancia con el plan: <span className="text-success font-semibold">
                    +{fmtShort(potentialGain)} ({((potentialGain / (noActionClose || 1)) * 100).toFixed(0)}%)
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
