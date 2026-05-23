import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { demandWindows } from '../../data/mockData';

const data = demandWindows.map((d) => ({
  week: d.week,
  score: d.opportunityScore,
  recommendation: d.recommendation,
}));

const scoreColor = (score: number) => {
  if (score >= 80) return '#15803D';
  if (score >= 60) return '#D97706';
  return '#6B7280';
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{value: number}>; label?: string }) => {
  if (!active || !payload?.length) return null;
  const item = data.find((d) => d.week === label);
  return (
    <div className="bg-white border border-ink-300/60 rounded-xl shadow-elevated px-4 py-3 text-[12px]">
      <p className="font-semibold text-ink-900">{label}</p>
      <p className="text-ink-700 mt-0.5">Score: <span className="font-bold">{payload[0].value}/100</span></p>
      {item && <p className="text-ink-500 mt-0.5">{item.recommendation}</p>}
    </div>
  );
};

export default function OpportunityChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={scoreColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
