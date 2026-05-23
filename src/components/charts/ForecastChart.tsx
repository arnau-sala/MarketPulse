import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell,
} from 'recharts';
import type { ForecastPoint } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'weekly' | 'monthly';

interface CumulativePoint {
  label: string;
  actual: number | null;
  forecast: number | null;
  target: number;
  isFuture: boolean;
}

interface MonthlyPoint {
  label: string;
  actual: number | null;
  forecast: number | null;
  target: number;
}

interface Props { data: ForecastPoint[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `£${(v / 1_000).toFixed(0)}k`;
  return `£${v}`;
}

/** Get "YYYY-MM" from a ForecastPoint (uses isoDate when available, parses day otherwise) */
function getYearMonth(p: ForecastPoint, index: number, all: ForecastPoint[]): string {
  if (p.isoDate && p.isoDate.length >= 7) return p.isoDate.slice(0, 7);

  // Fallback: parse "May 04" and infer year from sequence
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const parts = p.day.split(' ');
  const month = MONTHS.indexOf(parts[0]);
  if (month === -1) return p.day;

  // Detect year rollovers by finding decreasing month numbers
  let year = 2025;
  let prevMonth = month;
  for (let i = 0; i < index; i++) {
    const prevParts = all[i].day.split(' ');
    const pm = MONTHS.indexOf(prevParts[0]);
    if (pm > prevMonth && pm - prevMonth > 6) year--;
    if (pm < prevMonth && prevMonth - pm > 6) year++;
    prevMonth = pm;
  }
  return `${year}-${(month + 1).toString().padStart(2, '0')}`;
}

function formatMonthLabel(ym: string): string {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [, mm] = ym.split('-');
  return MONTHS[parseInt(mm) - 1] ?? ym;
}

// ─── Data transforms ─────────────────────────────────────────────────────────

function toCumulative(data: ForecastPoint[]): CumulativePoint[] {
  let cumActual = 0;
  let cumForecast = 0;
  let lastActualCum = 0;
  let forecastStarted = false;

  return data.map(p => {
    const label = p.day;
    const isFuture = p.actual === null;

    if (!isFuture) {
      cumActual += p.actual!;
      lastActualCum = cumActual;
      return { label, actual: cumActual, forecast: null, target: p.target, isFuture };
    } else {
      if (!forecastStarted) {
        forecastStarted = true;
        cumForecast = 0;
      }
      cumForecast += p.forecast ?? 0;
      return { label, actual: null, forecast: lastActualCum + cumForecast, target: p.target, isFuture };
    }
  });
}

function toMonthly(data: ForecastPoint[]): MonthlyPoint[] {
  const map = new Map<string, { actual: number; forecast: number; target: number; hasActual: boolean }>();

  data.forEach((p, i, arr) => {
    const ym = getYearMonth(p, i, arr);
    const existing = map.get(ym) ?? { actual: 0, forecast: 0, target: 0, hasActual: false };

    if (p.actual !== null) {
      existing.actual += p.actual;
      existing.hasActual = true;
    } else {
      existing.forecast += p.forecast ?? 0;
    }
    existing.target += p.target;
    map.set(ym, existing);
  });

  return Array.from(map.entries()).map(([ym, v]) => ({
    label: formatMonthLabel(ym),
    actual:   v.hasActual ? v.actual   : null,
    forecast: !v.hasActual ? v.forecast : null,
    target:   v.target,
  }));
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-300/60 rounded-xl shadow-elevated px-4 py-3 text-[12px]">
      <p className="font-semibold text-ink-900 mb-1.5">{label}</p>
      {payload.map(p =>
        p.value != null && (
          <div key={p.name} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-ink-500">{p.name}:</span>
            <span className="font-semibold text-ink-900">{formatCurrency(p.value)}</span>
          </div>
        )
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ForecastChart({ data }: Props) {
  const [view, setView] = useState<ViewMode>('weekly');

  const weeklyData  = useMemo(() => toCumulative(data), [data]);
  const monthlyData = useMemo(() => toMonthly(data), [data]);

  const maxMonthlyValue = useMemo(() =>
    Math.max(...monthlyData.flatMap(d => [d.actual ?? 0, d.forecast ?? 0, d.target])),
    [monthlyData]
  );

  return (
    <div>
      {/* Toggle */}
      <div className="flex gap-1 mb-4">
        {(['weekly', 'monthly'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
              view === v
                ? 'bg-ink-900 text-white'
                : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
            }`}
          >
            {v === 'weekly' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      {/* Weekly cumulative chart */}
      {view === 'weekly' && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              interval={Math.floor(weeklyData.length / 7)}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, color: '#6B7280' }} iconType="circle" iconSize={8} />
            <Line type="monotone" dataKey="actual"   name="Cumulative sales"    stroke="#171717" strokeWidth={2.5} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="forecast" name="Projected close"     stroke="#D97706" strokeWidth={2}   dot={false} strokeDasharray="6 3" connectNulls />
            <Line type="monotone" dataKey="target"   name="Cumulative target"   stroke="#B91C1C" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Monthly bar chart */}
      {view === 'monthly' && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }} barCategoryGap="30%" barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              width={56}
              domain={[0, maxMonthlyValue * 1.1]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, color: '#6B7280' }} iconType="square" iconSize={8} />
            <ReferenceLine y={0} stroke="#E5E7EB" />
            <Bar dataKey="actual"   name="Actual sales"      radius={[4, 4, 0, 0]}>
              {monthlyData.map((_, i) => <Cell key={i} fill="#171717" />)}
            </Bar>
            <Bar dataKey="forecast" name="Forecast"          radius={[4, 4, 0, 0]}>
              {monthlyData.map((_, i) => <Cell key={i} fill="#D97706" fillOpacity={0.8} />)}
            </Bar>
            <Bar dataKey="target"   name="Monthly target"    radius={[4, 4, 0, 0]}>
              {monthlyData.map((_, i) => <Cell key={i} fill="#E5E7EB" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
