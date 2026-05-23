import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { ChannelPerformance } from '../../types';

interface Props { data: ChannelPerformance[] }

const fmt = (v: number) => `£${(v / 1000).toFixed(0)}k`;

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-300/60 rounded-xl shadow-elevated px-4 py-3 text-[12px]">
      <p className="font-semibold text-ink-900 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-ink-500">{p.name}:</span>
          <span className="font-semibold text-ink-900">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ChannelMixChart({ data }: Props) {
  const chartData = data.map(c => ({ channel: c.channel, Actual: c.actual, Target: c.target }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="35%" barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="square" iconSize={8} />
        <Bar dataKey="Actual" fill="#171717" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Target" fill="#E5E7EB"  radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
