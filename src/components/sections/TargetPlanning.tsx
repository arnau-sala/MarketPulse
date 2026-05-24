import { useEffect, useMemo, useState } from 'react';
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
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { TARGET_BASELINE_YEAR } from '../../data/profitHistory';
import { useOpenBaselineHistorical } from '../../context/AppUIContext';
import { useTargetPlan, type TargetMonth, type TargetMonthKey } from '../../context/TargetContext';
import { netProfitHistory } from '../../data/profitHistory';

const BASELINE_AVERAGE_LABEL = '3-yr avg';

function groupByQuarter(months: TargetMonth[]) {
  return ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => ({
    quarter,
    months: months.filter((month) => month.quarter === quarter),
  }));
}

const TARGET_STEP = 100_000;

function parseTargetDraft(draft: string, fallback: number) {
  const trimmed = draft.trim();
  if (trimmed === '') {
    return fallback;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.round(parsed));
}

function EditableTargetInput({
  monthKey,
  value,
  onCommit,
}: {
  monthKey: TargetMonthKey;
  value: number;
  onCommit: (monthKey: TargetMonthKey, target: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft ?? String(value);

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commitDraft = (raw: string) => {
    onCommit(monthKey, parseTargetDraft(raw, value));
    setDraft(null);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={displayValue}
      onChange={(event) => {
        const next = event.target.value.replace(/[^\d]/g, '');
        setDraft(next);
      }}
      onFocus={(event) => {
        setDraft(event.target.value.replace(/[^\d]/g, ''));
        event.target.select();
      }}
      onBlur={(event) => commitDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
          return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          const current = parseTargetDraft(draft ?? String(value), value);
          const next =
            event.key === 'ArrowUp'
              ? current + TARGET_STEP
              : Math.max(0, current - TARGET_STEP);
          onCommit(monthKey, next);
          setDraft(String(next));
        }
      }}
      className="w-full rounded-lg border border-ink-300 bg-white py-2 pl-7 pr-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-brand-red"
      aria-label="Editable monthly target"
    />
  );
}

const CHART_LAST_YEAR_FILL = '#EDE8DF';
const CHART_LAST_YEAR_STROKE = '#C9BFB0';
const CHART_UPLIFT_FILL = '#15803D';
const CHART_UPLIFT_STROKE = '#166534';

function TargetTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; baselineAverage: number; uplift: number; target: number } }> }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;
  const gap = item.target - item.baselineAverage;
  const gapPct = item.baselineAverage > 0 ? (gap / item.baselineAverage) * 100 : 0;

  return (
    <div className="rounded-xl border border-ink-300 bg-white px-3 py-2.5 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{item.label}</p>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-[#C9BFB0]" style={{ background: CHART_LAST_YEAR_FILL }} />
          <span className="text-ink-500">{BASELINE_AVERAGE_LABEL}</span>
          <span className="ml-auto font-semibold text-ink-900">{formatCurrency(item.baselineAverage, true)}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: gap >= 0 ? CHART_UPLIFT_FILL : '#D97706' }} />
          <span className="text-ink-500">vs baseline ({formatPercent(Math.abs(gapPct), 0)})</span>
          <span className={`ml-auto font-semibold ${gap >= 0 ? 'text-success' : 'text-warning'}`}>
            {gap >= 0 ? '+' : '−'}
            {formatCurrency(Math.abs(gap), true)}
          </span>
        </div>
        <div className="border-t border-ink-100 pt-1.5 flex items-center justify-between text-[12px]">
          <span className="font-medium text-ink-600">Monthly target</span>
          <span className="font-bold text-ink-900">{formatCurrency(item.target, true)}</span>
        </div>
      </div>
    </div>
  );
}

export default function TargetPlanning() {
  const { months, annualTarget, currentMonth, currentMonthTarget, currentQuarter, currentQuarterTarget, weeklyTarget, updateTarget } = useTargetPlan();
  const openBaselineHistorical = useOpenBaselineHistorical();
  const [selectedHistoryYear, setSelectedHistoryYear] = useState(2025);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);

  const chartData = useMemo(
    () =>
      months.map((month) => ({
        ...month,
        chartBase: Math.min(month.target, month.baselineAverage),
        uplift: Math.max(month.target - month.baselineAverage, 0),
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
    () => selectedQuarterGroup.months.reduce((sum, month) => sum + month.baselineAverage, 0),
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
        title="Editable monthly targets"
        description="Each month starts at the 3-year average net profit +10%. Changing a month updates the quarter, annual total and the charts live."
        descriptionClassName="max-w-none"
      />

      <div className="rounded-2xl border border-ink-300 bg-white p-4 shadow-card">
          <div className="flex flex-col gap-2 border-b border-ink-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Monthly gain chart</p>
              <p className="mt-0.5 text-[13px] text-ink-500">
                Each bar stacks the 3-year monthly average (beige) and the uplift to reach the target (green).
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm border"
                    style={{ background: CHART_LAST_YEAR_FILL, borderColor: CHART_LAST_YEAR_STROKE }}
                  />
                  <span className="text-[11px] font-medium text-ink-600">{BASELINE_AVERAGE_LABEL}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ background: CHART_UPLIFT_FILL }} />
                  <span className="text-[11px] font-medium text-ink-600">Uplift to target</span>
                </div>
              </div>
            </div>
            <div className="rounded-full border border-ink-200 bg-cream-50 px-3 py-1 text-[11px] font-semibold text-ink-600">
              Beige + green = target
            </div>
          </div>

          <div className="mt-3 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                <YAxis tickFormatter={(value) => formatCurrency(value as number, true)} tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={58} />
                <Tooltip content={<TargetTooltip />} cursor={false} />
                <Bar
                  dataKey="chartBase"
                  stackId="target"
                  name={`${BASELINE_AVERAGE_LABEL} net profit`}
                  fill={CHART_LAST_YEAR_FILL}
                  stroke={CHART_LAST_YEAR_STROKE}
                  strokeWidth={1}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="uplift"
                  stackId="target"
                  name="Uplift to target"
                  fill={CHART_UPLIFT_FILL}
                  stroke={CHART_UPLIFT_STROKE}
                  strokeWidth={1}
                  radius={[6, 6, 0, 0]}
                  activeBar={{ fill: '#16A34A', stroke: CHART_UPLIFT_STROKE, strokeWidth: 1 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Annual target" value={formatCurrency(annualTarget, true)} subtitle="Sum of all months" tone="neutral" />
        <MetricCard title="Current month" value={formatCurrency(currentMonthTarget, true)} subtitle={`${currentMonth.label} target`} tone="neutral" />
        <MetricCard title="Current quarter" value={formatCurrency(currentQuarterTarget, true)} subtitle={`${currentQuarter} total`} tone="neutral" />
        <MetricCard title="Weekly target" value={formatCurrency(weeklyTarget, true)} subtitle={`${currentMonth.label} / 4`} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] xl:items-stretch">
        <div className="flex h-full flex-col rounded-2xl border border-ink-300 bg-cream-50/60 p-3 shadow-card">
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
                  onClick={() => setSelectedQuarter(group.quarter as typeof selectedQuarter)}
                  className={`flex min-h-[76px] w-full flex-1 flex-col justify-between rounded-xl border bg-white px-3 py-3 text-left transition-all duration-150 ${
                    isActive
                      ? 'border-brand-red text-ink-900'
                      : 'border-ink-300 text-ink-600 hover:border-ink-400 hover:text-ink-900'
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

        <div className="rounded-2xl border border-ink-300 bg-white p-5 shadow-card">
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
              const uplift = month.target - month.baselineAverage;
              const upliftPct = month.baselineAverage > 0 ? (uplift / month.baselineAverage) * 100 : 0;
              const weekly = Math.round(month.target / 4 / 1000) * 1000;
              const isDefaultTarget = month.target === month.defaultTarget;

              return (
                <div key={month.key} className="rounded-xl border border-ink-300 bg-cream-50/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">{month.label}</p>
                      <p className="mt-1 text-[18px] font-bold text-ink-900">{formatCurrency(month.target, true)}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        uplift >= 0
                          ? 'border-ink-200 bg-white text-ink-500'
                          : 'border-warning/30 bg-warning-light text-warning'
                      }`}
                    >
                      {uplift >= 0 ? '' : '−'}
                      {formatPercent(Math.abs(upliftPct), 0)} vs baseline
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink-500 items-stretch">
                    <button
                      type="button"
                      onClick={openBaselineHistorical}
                      className="flex h-full flex-col items-center justify-center rounded-lg border border-ink-300 bg-white px-3 py-2 text-center transition-colors hover:border-brand-red hover:bg-cream-50/80"
                      aria-label={`View ${TARGET_BASELINE_YEAR} in Historical Data`}
                    >
                      <p className="uppercase tracking-wider">{BASELINE_AVERAGE_LABEL}</p>
                      <p className="mt-1 text-[12px] font-semibold text-ink-900">{formatCurrency(month.baselineAverage, true)}</p>
                    </button>
                    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-ink-300 bg-white px-3 py-2 text-center">
                      <p className="uppercase tracking-wider">Weekly</p>
                      <p className="mt-1 text-[12px] font-semibold text-ink-900">{formatCurrency(weekly, true)}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Editable target</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="relative min-w-0 flex-1 max-w-[180px]">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-ink-500">£</span>
                        <EditableTargetInput
                          monthKey={month.key}
                          value={month.target}
                          onCommit={updateTarget}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateTarget(month.key, month.defaultTarget)}
                        disabled={isDefaultTarget}
                        aria-label="Reset target to default value"
                        title="Reset target to default value"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-300 bg-white text-ink-600 transition-colors hover:border-brand-red hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
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
