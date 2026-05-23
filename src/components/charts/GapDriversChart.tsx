import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import type { GapDriver } from '../../types';

interface Props { data: GapDriver[] }

const COLORS = ['#B91C1C', '#DC2626', '#EF4444', '#FCA5A5'];

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-300/60 rounded-xl shadow-elevated px-4 py-3 text-[12px]">
      <p className="font-semibold text-ink-900 mb-1">{label}</p>
      <p className="text-danger font-semibold">-£{(payload[0].value / 1000).toFixed(0)}k impact</p>
    </div>
  );
};

export default function GapDriversChart({ data }: Props) {
  const chartData = data.map(d => ({
    name: d.name.length > 28 ? d.name.slice(0, 26) + '…' : d.name,
    impact: Math.abs(d.impact),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
        <XAxis type="number" tickFormatter={v => `-£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={180} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="impact" radius={[0, 6, 6, 0]}>
          {chartData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
