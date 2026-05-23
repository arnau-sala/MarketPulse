import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import type { DemandWindow } from '../../types';

interface Props { data: DemandWindow[] }

const scoreColor = (s: number) => s >= 80 ? '#15803D' : s >= 60 ? '#D97706' : '#6B7280';

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-300/60 rounded-xl shadow-elevated px-4 py-3 text-[12px]">
      <p className="font-semibold text-ink-900">{label}</p>
      <p className="text-ink-700 mt-0.5">Score: <span className="font-bold">{payload[0].value}/100</span></p>
    </div>
  );
};

export default function OpportunityChart({ data }: Props) {
  const chartData = data.map(d => ({ week: d.week, score: d.opportunityScore }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
          {chartData.map((e, i) => <Cell key={i} fill={scoreColor(e.score)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
