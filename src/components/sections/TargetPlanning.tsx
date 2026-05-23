import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import SectionHeader from '../common/SectionHeader';
import MetricCard from '../common/MetricCard';
import InsightCard from '../common/InsightCard';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { useTargetPlan, type TargetMonth } from '../../context/TargetContext';
import { netProfitHistory } from '../../data/profitHistory';

function groupByQuarter(months: TargetMonth[]) {
  return ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => ({
    quarter,
    months: months.filter((month) => month.quarter === quarter),
  }));
}

function getDefaultTarget(lastYearSales: number) {
  return Math.round(lastYearSales * 1.1 / 1000) * 1000;
}

function TargetTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; lastYearSales: number; uplift: number; target: number } }> }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="rounded-xl border border-ink-200 bg-white px-3 py-2 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{item.label}</p>
      <p className="mt-1 text-[12px] text-ink-700">Last year: {formatCurrency(item.lastYearSales, true)}</p>
      <p className="text-[12px] text-success">Uplift: {formatCurrency(item.uplift, true)}</p>
      <p className="text-[12px] font-semibold text-ink-900">Target: {formatCurrency(item.target, true)}</p>
    </div>
  );
}

export default function TargetPlanning() {
  const { months, annualTarget, currentMonth, currentMonthTarget, currentQuarter, currentQuarterTarget, weeklyTarget, updateTarget } = useTargetPlan();
  const [selectedHistoryYear, setSelectedHistoryYear] = useState(2025);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);

  const chartData = useMemo(
    () =>
      months.map((month) => ({
        ...month,
        uplift: Math.max(month.target - month.lastYearSales, 0),
        total: month.target,
      })),
    [months],
  );

  const quarterGroups = useMemo(() => groupByQuarter(months), [months]);
  const selectedQuarterGroup = useMemo(
    () => quarterGroups.find((group) => group.quarter === selectedQuarter) ?? quarterGroups[0],
    [quarterGroups, selectedQuarter],
  );

  const selectedQuarterTotal = useMemo(
    () => selectedQuarterGroup.months.reduce((sum, month) => sum + month.target, 0),
    [selectedQuarterGroup],
  );

  const selectedQuarterBase = useMemo(
    () => selectedQuarterGroup.months.reduce((sum, month) => sum + month.lastYearSales, 0),
    [selectedQuarterGroup],
  );

  const selectedQuarterUplift = selectedQuarterTotal - selectedQuarterBase;
  const selectedHistory = useMemo(
    () => netProfitHistory.find((yearBlock) => yearBlock.year === selectedHistoryYear) ?? netProfitHistory[0],
    [selectedHistoryYear],
  );

  const selectedHistoryAnnualTotal = useMemo(
    () => selectedHistory.months.reduce((sum, month) => sum + month.netProfitGbp, 0),
    [selectedHistory],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="06 — Target Planning"
        title="Editable monthly targets"
        description="Each month starts at last year +10%. Changing a month updates the quarter, annual total and the charts live. Weekly target is always one quarter of the month target."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Annual target" value={formatCurrency(annualTarget, true)} subtitle="Sum of all months" tone="neutral" />
        <MetricCard title="Current month" value={formatCurrency(currentMonthTarget, true)} subtitle={`${currentMonth.label} target`} tone="neutral" />
        <MetricCard title="Current quarter" value={formatCurrency(currentQuarterTarget, true)} subtitle={`${currentQuarter} total`} tone="neutral" />
        <MetricCard title="Weekly target" value={formatCurrency(weeklyTarget, true)} subtitle={`${currentMonth.label} / 4`} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
          <div className="flex flex-col gap-2 border-b border-ink-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Monthly gain chart</p>
              <p className="mt-1 text-[13px] text-ink-500">The beige bar is last year; the colored top is the 10% uplift that makes the target.</p>
            </div>
            <div className="rounded-full border border-ink-200 bg-cream-50 px-3 py-1 text-[11px] font-semibold text-ink-600">
              Base + uplift = total target
            </div>
          </div>

          <div className="mt-4 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 18, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                <YAxis tickFormatter={(value) => formatCurrency(value as number, true)} tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={58} />
                <Tooltip content={<TargetTooltip />} />
                <Bar dataKey="lastYearSales" stackId="target" name="Last year" fill="#E5E7EB" stroke="#CBD5E1" strokeWidth={1} radius={[8, 8, 0, 0]} />
                <Bar dataKey="uplift" stackId="target" name="10% uplift" fill="#F59E0B" stroke="#D97706" strokeWidth={1} radius={[8, 8, 0, 0]}>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Formula</p>
            <p className="mt-2 text-[13px] leading-6 text-ink-600">
              Every month starts from last year&apos;s sales and adds a 10% uplift. When you edit a month, the quarter total is recalculated from the edited months and the chart in Executive Pulse updates immediately.
            </p>
          </div>

          <InsightCard title="Planning rules" tone="neutral">
            <ul className="space-y-2 text-[13px] leading-5 text-ink-600">
              <li>• Weekly target = monthly target / 4.</li>
              <li>• Quarter target = sum of the months in that quarter.</li>
              <li>• Annual target = sum of all monthly targets.</li>
            </ul>
          </InsightCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] xl:items-stretch">
        <div className="flex h-full flex-col rounded-2xl border border-ink-200 bg-cream-50/60 p-3 shadow-card">
          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Quarters</p>
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            {quarterGroups.map((group) => {
              const quarterTotal = group.months.reduce((sum, month) => sum + month.target, 0);
              const isActive = group.quarter === selectedQuarter;
              const monthNames = group.months.map((month) => month.label).join(' · ');

              return (
                <button
                  key={group.quarter}
                  type="button"
                  onClick={() => setSelectedQuarter(group.quarter)}
                  className={`flex min-h-[76px] w-full flex-1 flex-col justify-between rounded-xl border px-3 py-3 text-left transition-all duration-150 ${
                    isActive
                      ? 'border-brand-red/15 bg-white text-ink-900 shadow-[0_1px_0_rgba(15,23,42,0.03)]'
                      : 'border-transparent bg-transparent text-ink-600 hover:border-ink-200 hover:bg-white hover:text-ink-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold">{group.quarter}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">{monthNames}</p>
                    </div>
                    <span className="rounded-full border border-ink-200 bg-cream-50 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                      {formatCurrency(quarterTotal, true)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
          <div className="flex flex-col gap-4 border-b border-ink-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">{selectedQuarterGroup.quarter}</p>
              <p className="mt-1 text-[30px] font-bold tracking-tight text-ink-900 sm:text-[34px]">{formatCurrency(selectedQuarterTotal, true)} target</p>
              <p className="mt-1 max-w-xl text-[12px] text-ink-500">
                Quarter total updates from the month targets below.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
              <span className="rounded-full border border-ink-200 bg-cream-50 px-2.5 py-1 text-[10px] font-semibold text-ink-600">
                {selectedQuarterGroup.months.length} months
              </span>
              <div>
                <p className="text-[11px] text-ink-500">Base + uplift</p>
                <p className="text-[12px] font-semibold text-ink-700">
                  {formatCurrency(selectedQuarterBase, true)} + {formatCurrency(selectedQuarterUplift, true)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {selectedQuarterGroup.months.map((month) => {
              const uplift = Math.max(month.target - month.lastYearSales, 0);
              const upliftPct = month.lastYearSales > 0 ? (uplift / month.lastYearSales) * 100 : 0;
              const weekly = Math.round(month.target / 4 / 1000) * 1000;
              const defaultTarget = getDefaultTarget(month.lastYearSales);
              const isDefaultTarget = month.target === defaultTarget;

              return (
                <div key={month.key} className="rounded-xl border border-ink-200 bg-cream-50/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">{month.label}</p>
                      <p className="mt-1 text-[18px] font-bold text-ink-900">{formatCurrency(month.target, true)}</p>
                    </div>
                    <span className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                      {formatPercent(upliftPct, 0)} uplift
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink-500">
                    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2">
                      <p className="uppercase tracking-wider">Last year</p>
                      <p className="mt-1 text-[12px] font-semibold text-ink-900">{formatCurrency(month.lastYearSales, true)}</p>
                    </div>
                    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2">
                      <p className="uppercase tracking-wider">Weekly</p>
                      <p className="mt-1 text-[12px] font-semibold text-ink-900">{formatCurrency(weekly, true)}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Editable target</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="relative min-w-0 flex-1 max-w-[180px]">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-ink-500">£</span>
                        <input
                          type="number"
                          min={month.lastYearSales}
                          step={1000}
                          value={month.target}
                          onChange={(event) => updateTarget(month.key, Number(event.target.value))}
                          className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-7 pr-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-brand-red"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateTarget(month.key, defaultTarget)}
                        disabled={isDefaultTarget}
                        aria-label="Reset target to default value"
                        title="Reset target to default value"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition-colors hover:border-brand-red hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-2 border-b border-ink-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Net profit history</p>
            <p className="mt-1 text-[13px] text-ink-500">
              Real data from the <span className="font-semibold text-ink-700">DATABASE</span> sheet, converted from thousands of euros to pounds using a fixed €1 = £0.85 assumption.
            </p>
          </div>
          <div className="rounded-full border border-ink-200 bg-cream-50 px-3 py-1 text-[11px] font-semibold text-ink-600">
            Values are net profit
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-stretch">
          <div className="flex h-full flex-col rounded-2xl border border-ink-200 bg-cream-50/70 p-3 shadow-card">
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Years</p>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {netProfitHistory.map((yearBlock) => {
                const annualTotal = yearBlock.months.reduce((sum, month) => sum + month.netProfitGbp, 0);
                const isActive = yearBlock.year === selectedHistoryYear;

                return (
                  <button
                    key={yearBlock.year}
                    type="button"
                    onClick={() => setSelectedHistoryYear(yearBlock.year)}
                    className={`flex min-h-[76px] w-full flex-1 flex-col justify-between rounded-xl border px-3 py-3 text-left transition-all duration-150 ${
                      isActive
                        ? 'border-brand-red/15 bg-white text-ink-900 shadow-[0_1px_0_rgba(15,23,42,0.03)]'
                        : 'border-transparent bg-transparent text-ink-600 hover:border-ink-200 hover:bg-white hover:text-ink-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold">{yearBlock.year}</p>
                      </div>
                      <span className="rounded-full border border-ink-200 bg-cream-50 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                        {formatCurrency(annualTotal, true)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
            <div className="flex flex-col gap-4 border-b border-ink-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">{selectedHistory.year}</p>
                <p className="mt-1 text-[30px] font-bold tracking-tight text-ink-900 sm:text-[34px]">{formatCurrency(selectedHistoryAnnualTotal, true)} annual net profit</p>
                <p className="mt-1 max-w-xl text-[12px] text-ink-500">
                  Real data from the DATABASE sheet, converted from thousands of euros to pounds using a fixed €1 = £0.85 assumption.
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                <span className="rounded-full border border-ink-200 bg-cream-50 px-2.5 py-1 text-[10px] font-semibold text-ink-600">
                  {selectedHistory.months.length} months
                </span>
                <div>
                  <p className="text-[11px] text-ink-500">Visual summary</p>
                  <p className="text-[12px] font-semibold text-ink-700">Monthly net profit</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {selectedHistory.months.map((month) => (
                <div key={`${selectedHistory.year}-${month.month}`} className="min-h-[76px] rounded-xl border border-ink-200 bg-cream-50/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">{month.month}</p>
                      <p className="mt-1 text-[18px] font-bold text-ink-900">{formatCurrency(month.netProfitGbp, true)}</p>
                    </div>
                    <span className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                      {selectedHistory.year}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
