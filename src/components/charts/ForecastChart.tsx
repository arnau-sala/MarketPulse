import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { forecastSeries } from '../../data/mockData';

function formatTick(v: number) {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `£${(v / 1_000).toFixed(0)}k`;
  return `£${v}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-300/60 rounded-xl shadow-elevated px-4 py-3 text-[12px]">
      <p className="font-semibold text-ink-900 mb-1.5">{label}</p>
      {payload.map((p) => (
        p.value != null && (
          <div key={p.name} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-ink-500">{p.name}:</span>
            <span className="font-semibold text-ink-900">{formatTick(p.value)}</span>
          </div>
        )
      ))}
    </div>
  );
};

export default function ForecastChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={forecastSeries} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
          interval={2}
        />
        <YAxis
          tickFormatter={formatTick}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12, color: '#6B7280' }}
          iconType="circle"
          iconSize={8}
        />
        <ReferenceLine
          y={1200000}
          stroke="#B91C1C"
          strokeDasharray="5 4"
          strokeWidth={1.5}
          label={{ value: 'Target', position: 'insideTopRight', fontSize: 10, fill: '#B91C1C' }}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual sales"
          stroke="#171717"
          strokeWidth={2.5}
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="target"
          name="Target pace"
          stroke="#B91C1C"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          name="Baseline forecast"
          stroke="#D97706"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="actionForecast"
          name="After recommended plan"
          stroke="#15803D"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
