import { useEffect, useMemo, useState } from 'react';
import { useAppUI } from '../../context/AppUIContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import SectionHeader from '../common/SectionHeader';
import { formatCurrency } from '../../utils/formatters';
import { netProfitHistory, type NetProfitHistoryMonth } from '../../data/profitHistory';

const CALENDAR_MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

type CalendarSlot = {
  monthNumber: number;
  label: string;
  month: NetProfitHistoryMonth | null;
};

function buildCalendarSlots(months: NetProfitHistoryMonth[]): CalendarSlot[] {
  const byMonthNumber = new Map(months.map((month) => [month.monthNumber, month]));

  return CALENDAR_MONTH_LABELS.map((label, index) => {
    const monthNumber = index + 1;
    return {
      monthNumber,
      label,
      month: byMonthNumber.get(monthNumber) ?? null,
    };
  });
}

export default function HistoricalData() {
  const { historicalYear, setHistoricalYear } = useAppUI();
  const [selectedHistoryYear, setSelectedHistoryYear] = useState(historicalYear);

  useEffect(() => {
    setSelectedHistoryYear(historicalYear);
  }, [historicalYear]);

  const handleSelectYear = (year: number) => {
    setSelectedHistoryYear(year);
    setHistoricalYear(year);
  };

  const selectedHistory = useMemo(
    () => netProfitHistory.find((yearBlock) => yearBlock.year === selectedHistoryYear) ?? netProfitHistory[0],
    [selectedHistoryYear],
  );

  const selectedHistoryAnnualTotal = useMemo(
    () => selectedHistory.months.reduce((sum, month) => sum + month.netProfitGbp, 0),
    [selectedHistory],
  );

  const selectedHistoryChartData = useMemo(
    () =>
      selectedHistory.months.map((month) => ({
        month: month.month.slice(0, 3).toUpperCase(),
        netProfit: month.netProfitGbp,
      })),
    [selectedHistory],
  );

  const calendarSlots = useMemo(
    () => buildCalendarSlots(selectedHistory.months),
    [selectedHistory.months],
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Historical net profit"
        description="Monthly net profit by year. Source: DATABASE sheet (€ → £ at 0.85)."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] xl:items-stretch">
          <div className="flex h-full min-h-0 flex-col rounded-2xl border border-ink-300 bg-cream-50/60 p-3 shadow-card">
            <p className="shrink-0 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Years</p>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {netProfitHistory.map((yearBlock) => {
                const annualTotal = yearBlock.months.reduce((sum, month) => sum + month.netProfitGbp, 0);
                const isActive = yearBlock.year === selectedHistoryYear;

                return (
                  <button
                    key={yearBlock.year}
                    type="button"
                    onClick={() => handleSelectYear(yearBlock.year)}
                    className={`flex min-h-0 w-full flex-1 flex-col justify-between rounded-xl border bg-white px-3 py-3 text-left transition-all duration-150 ${
                      isActive
                        ? 'border-brand-red text-ink-900'
                        : 'border-ink-300 text-ink-600 hover:border-ink-400 hover:text-ink-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold">{yearBlock.year}</p>
                      <span className="rounded-full border border-ink-200 bg-cream-50 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                        {formatCurrency(annualTotal, true)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-300 bg-white p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-ink-100 pb-2.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{selectedHistory.year}</p>
                <p className="text-[22px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[24px]">
                  {formatCurrency(selectedHistoryAnnualTotal, true)}
                  <span className="ml-1.5 text-[12px] font-semibold text-ink-500">annual net profit</span>
                </p>
              </div>
              <span className="rounded-full border border-ink-200 bg-cream-50 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                {selectedHistory.months.length} months
              </span>
            </div>

            <div className="mt-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,1.3fr)]">
              <div className="flex items-center justify-center rounded-xl border border-ink-200/80 bg-cream-50/40 p-3">
                <div className="grid h-[200px] w-full grid-cols-4 grid-rows-3 gap-2">
                  {calendarSlots.map((slot) =>
                    slot.month ? (
                      <div
                        key={`${selectedHistory.year}-${slot.monthNumber}`}
                        className="flex h-full min-h-0 flex-col items-center justify-center rounded-lg border border-ink-300 bg-white px-2 py-2 text-center"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{slot.label}</p>
                        <p className="mt-0.5 text-[14px] font-bold leading-tight text-ink-900">
                          {formatCurrency(slot.month.netProfitGbp, true)}
                        </p>
                      </div>
                    ) : (
                      <div
                        key={`${selectedHistory.year}-empty-${slot.monthNumber}`}
                        className="h-full min-h-0 rounded-lg border border-ink-200/70 bg-white/40"
                        aria-hidden
                      />
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-ink-300 bg-cream-50/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Profit trend</p>
                  <span className="text-[10px] font-semibold text-ink-600">Monthly net profit</span>
                </div>
                <div className="mt-2 h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedHistoryChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 9, fill: '#6B7280' }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip
                        cursor={false}
                        formatter={(value: number) => formatCurrency(value, true)}
                        contentStyle={{ borderRadius: 12, borderColor: 'rgba(226,232,240,1)', boxShadow: '0 10px 30px rgba(15,23,42,0.08)', fontSize: 12 }}
                      />
                      <Bar
                        dataKey="netProfit"
                        fill="#B91C1C"
                        stroke="#991B1B"
                        strokeWidth={1}
                        radius={[4, 4, 0, 0]}
                        activeBar={{ fill: '#DC2626', stroke: '#B91C1C', strokeWidth: 2 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
