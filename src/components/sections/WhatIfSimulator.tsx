import { useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, Gauge, Percent, Route, Store, WalletCards } from 'lucide-react';
import forecastSnapshot from '../../../public/forecast_results.json';
import SectionHeader from '../common/SectionHeader';
import { useTargetPlan } from '../../context/TargetContext';
import { netProfitHistory } from '../../data/profitHistory';
import { DEMO_BASELINE_FORECAST_GBP } from '../../config/demoConfig';
import { formatCurrency, formatDelta, formatPercent } from '../../utils/formatters';

interface ForecastRow {
  fecha: string;
  tipo: 'historico' | 'forecast' | 'futuro';
  venta_real_historica: number | null;
  prediccion_futura: number | null;
  Hay_Promocion?: number;
  Impacto_Futbol?: number;
}

interface Campaign {
  id: string;
  name: string;
  period: string;
  year: number;
  weeks: Array<{
    label: string;
    actual: number;
    expected: number;
    incremental: number;
    football: number;
  }>;
  generated: number;
  liftPct: number;
  peakFootball: number;
  duration: number;
  baselineWeekly: number;
  bestWeek: string;
}

type LeverKey = 'investment' | 'discount' | 'distribution' | 'duration' | 'execution';

const rows = (forecastSnapshot.series as ForecastRow[])
  .filter((row) => row.tipo === 'historico' && typeof row.venta_real_historica === 'number')
  .map((row) => ({
    date: new Date(`${row.fecha}T00:00:00Z`),
    hl: row.venta_real_historica ?? 0,
    promo: row.Hay_Promocion ?? 0,
    football: row.Impacto_Futbol ?? 0,
  }))
  .filter((row) => !Number.isNaN(row.date.getTime()))
  .sort((a, b) => a.date.getTime() - b.date.getTime());

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function weekLabel(date: Date) {
  return date.toLocaleDateString('en-GB', { month: 'short', day: '2-digit', timeZone: 'UTC' }).replace('.', '');
}

function gbpPerHl() {
  const profitByMonth = new Map<string, number>();
  for (const year of netProfitHistory) {
    for (const month of year.months) {
      profitByMonth.set(`${year.year}-${String(month.monthNumber).padStart(2, '0')}`, month.netProfitGbp);
    }
  }

  const hlByMonth = new Map<string, number>();
  for (const row of rows) {
    const key = monthKey(row.date);
    hlByMonth.set(key, (hlByMonth.get(key) ?? 0) + row.hl);
  }

  let profit = 0;
  let hl = 0;
  for (const [key, value] of hlByMonth) {
    const monthProfit = profitByMonth.get(key);
    if (monthProfit && value > 0) {
      profit += monthProfit;
      hl += value;
    }
  }

  return hl > 0 ? profit / hl : 44;
}

const GBP_PER_HL = gbpPerHl();

function seasonalBaselineHl(target: (typeof rows)[number]) {
  const month = target.date.getUTCMonth();
  const samples = rows.filter((row) => {
    const distanceDays = Math.abs(row.date.getTime() - target.date.getTime()) / 86_400_000;
    return row.date.getUTCMonth() === month && distanceDays > 21 && row.promo !== 1;
  });

  if (samples.length === 0) {
    return target.hl;
  }

  const sorted = samples.map((row) => row.hl).sort((a, b) => a - b);
  const trim = Math.floor(sorted.length * 0.12);
  const trimmed = sorted.slice(trim, Math.max(trim + 1, sorted.length - trim));
  return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
}

function buildCampaigns(): Campaign[] {
  const candidates = rows
    .map((row) => {
      const expectedHl = seasonalBaselineHl(row);
      const incrementalHl = row.hl - expectedHl;
      const liftPct = expectedHl > 0 ? (incrementalHl / expectedHl) * 100 : 0;
      return { ...row, expectedHl, incrementalHl, liftPct };
    })
    .filter((row) => row.incrementalHl > 850 || row.liftPct > 18 || row.football >= 70 || row.promo === 1);

  const grouped: typeof candidates[] = [];
  for (const row of candidates) {
    const previousGroup = grouped[grouped.length - 1];
    const previous = previousGroup?.[previousGroup.length - 1];
    const distanceDays = previous ? (row.date.getTime() - previous.date.getTime()) / 86_400_000 : Infinity;

    if (previousGroup && distanceDays <= 14) {
      previousGroup.push(row);
    } else {
      grouped.push([row]);
    }
  }

  return grouped
    .filter((group) => group.length >= 2)
    .map((group, index) => {
      const generated = Math.round(group.reduce((sum, row) => sum + Math.max(0, row.incrementalHl * GBP_PER_HL), 0));
      const actual = group.reduce((sum, row) => sum + row.hl, 0);
      const expected = group.reduce((sum, row) => sum + row.expectedHl, 0);
      const best = group.reduce((max, row) => (row.incrementalHl > max.incrementalHl ? row : max), group[0]);
      const first = group[0].date;
      const last = group[group.length - 1].date;
      const peakFootball = Math.round(Math.max(...group.map((row) => row.football)));
      const name =
        peakFootball >= 75
          ? 'Football demand burst'
          : group.some((row) => row.promo === 1)
            ? 'Promo activation'
            : 'Seasonal sales spike';

      return {
        id: `campaign-${index}`,
        name,
        period: `${weekLabel(first)} - ${weekLabel(last)}`,
        year: first.getUTCFullYear(),
        generated,
        liftPct: expected > 0 ? ((actual - expected) / expected) * 100 : 0,
        peakFootball,
        duration: group.length,
        baselineWeekly: Math.round((expected / group.length) * GBP_PER_HL),
        bestWeek: weekLabel(best.date),
        weeks: group.map((row) => ({
          label: weekLabel(row.date),
          actual: Math.round(row.hl * GBP_PER_HL),
          expected: Math.round(row.expectedHl * GBP_PER_HL),
          incremental: Math.round(Math.max(0, row.incrementalHl * GBP_PER_HL)),
          football: row.football,
        })),
      };
    })
    .sort((a, b) => b.generated - a.generated)
    .slice(0, 5);
}

const campaigns = buildCampaigns();

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function responseCurve(value: number, optimum: number, spread: number, floor: number, ceiling: number) {
  const penalty = Math.pow((value - optimum) / spread, 2);
  return clamp(ceiling - penalty, floor, ceiling);
}

function currencyTick(value: number) {
  return formatCurrency(value, true);
}

function SliderControl({
  label,
  value,
  min,
  max,
  suffix,
  icon,
  onChange,
  onActivate,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  icon: ReactNode;
  onChange: (value: number) => void;
  onActivate: () => void;
}) {
  return (
    <label className="rounded-lg border border-ink-200 bg-white px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          {icon}
          {label}
        </span>
        <span className="text-[12px] font-bold text-ink-900">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onFocus={onActivate}
        onPointerDown={onActivate}
        onChange={(event) => {
          onActivate();
          onChange(Number(event.target.value));
        }}
        className="h-2 w-full accent-brand-red"
      />
    </label>
  );
}

function Kpi({ label, value, detail, tone = 'neutral' }: { label: string; value: string; detail: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-ink-900';

  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`mt-1 text-[19px] font-bold leading-none ${color}`}>{value}</p>
      <p className="mt-1 text-[10px] text-ink-500">{detail}</p>
    </div>
  );
}

export default function WhatIfSimulator() {
  const { currentMonthTarget } = useTargetPlan();
  const [selectedId, setSelectedId] = useState(campaigns[0]?.id ?? '');
  const [investment, setInvestment] = useState(82);
  const [discount, setDiscount] = useState(14);
  const [distribution, setDistribution] = useState(72);
  const [duration, setDuration] = useState(4);
  const [execution, setExecution] = useState(78);
  const [activeLever, setActiveLever] = useState<LeverKey>('discount');

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0];

  const simulation = useMemo(() => {
    if (!selectedCampaign) {
      return null;
    }

    const calculate = (values: Record<LeverKey, number>) => {
      const investmentEffect = responseCurve(values.investment, 88, 38, 0.72, 1.22);
      const discountEffect = responseCurve(values.discount, 16, 10, 0.66, 1.18);
      const distributionEffect = responseCurve(values.distribution, 78, 36, 0.70, 1.20);
      const durationEffect = responseCurve(values.duration, selectedCampaign.duration + 1, 3, 0.72, 1.14);
      const executionEffect = 0.74 + values.execution / 210;
      const saturationPenalty = Math.max(0, values.investment - 96) * Math.max(0, values.discount - 18) * 0.0009;
      const operationalPenalty = Math.max(0, values.distribution - 88) * Math.max(0, values.duration - 4) * 0.003;
      const multiplier = Math.max(
        0.35,
        investmentEffect * discountEffect * distributionEffect * durationEffect * executionEffect -
          saturationPenalty -
          operationalPenalty,
      );
      const predictedImpact = Math.round(selectedCampaign.generated * multiplier);
      const forecast = DEMO_BASELINE_FORECAST_GBP + predictedImpact;
      const gap = forecast - currentMonthTarget;
      const hitProbability = Math.round(
        clamp(34 + predictedImpact / 4300 + (values.execution - 70) * 0.22 - saturationPenalty * 18, 8, 94),
      );
      const spend = Math.round((selectedCampaign.generated / 2.7) * (values.investment / 82) * (values.distribution / 72));
      const roi = spend > 0 ? predictedImpact / spend : 0;
      const marginDrag = Math.max(0, values.discount - 16) * Math.round(predictedImpact * 0.006);
      const netIncremental = predictedImpact - marginDrag;

      return {
        predictedImpact,
        forecast,
        gap,
        hitProbability,
        spend,
        roi,
        marginDrag,
        netIncremental,
        investmentEffect,
        discountEffect,
        distributionEffect,
        durationEffect,
        executionEffect,
        operationalPenalty,
      };
    };

    const values = { investment, discount, distribution, duration, execution };
    const current = calculate(values);

    const shape = selectedCampaign.weeks.map((week) => week.incremental);
    const totalShape = shape.reduce((sum, value) => sum + value, 0) || 1;
    const futureWeeks = Array.from({ length: 6 }, (_, index) => {
      const active = index < duration;
      const rawShare = active ? (shape[index % shape.length] / totalShape) : 0;
      const lift = Math.round(current.predictedImpact * rawShare);
      return {
        week: `W${index + 1}`,
        noAction: Math.round(DEMO_BASELINE_FORECAST_GBP / 4.33),
        predicted: Math.round(DEMO_BASELINE_FORECAST_GBP / 4.33) + lift,
        lift,
      };
    });

    const levers = [
      { name: 'Investment', effect: Math.round((current.investmentEffect - 1) * 100) },
      { name: 'Discount', effect: Math.round((current.discountEffect - 1) * 100 - current.marginDrag / 3000) },
      { name: 'Distribution', effect: Math.round((current.distributionEffect - 1) * 100 - current.operationalPenalty * 20) },
      { name: 'Duration', effect: Math.round((current.durationEffect - 1) * 100) },
      { name: 'Execution', effect: Math.round((current.executionEffect - 1) * 100) },
    ];

    const leverRanges: Record<LeverKey, { label: string; min: number; max: number; suffix: string }> = {
      investment: { label: 'Investment', min: 45, max: 125, suffix: '%' },
      discount: { label: 'Discount', min: 0, max: 32, suffix: '%' },
      distribution: { label: 'Distribution', min: 25, max: 100, suffix: '%' },
      duration: { label: 'Duration', min: 1, max: 7, suffix: 'w' },
      execution: { label: 'Execution', min: 40, max: 100, suffix: '%' },
    };
    const activeConfig = leverRanges[activeLever];
    const responseSeries = Array.from({ length: 21 }, (_, index) => {
      const value = Math.round(activeConfig.min + ((activeConfig.max - activeConfig.min) / 20) * index);
      const next = calculate({ ...values, [activeLever]: value });
      return {
        value,
        predictedImpact: next.predictedImpact,
        netIncremental: next.netIncremental,
        forecast: next.forecast,
      };
    });
    const currentPoint = [{
      value: values[activeLever],
      predictedImpact: current.predictedImpact,
      netIncremental: current.netIncremental,
      forecast: current.forecast,
    }];

    return {
      ...current,
      futureWeeks,
      levers,
      responseSeries,
      currentPoint,
      activeConfig,
    };
  }, [activeLever, currentMonthTarget, discount, distribution, duration, execution, investment, selectedCampaign]);

  if (!selectedCampaign || !simulation) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Future campaign simulator" description="No campaign history is available in the current snapshot." />
      </div>
    );
  }

  const historicalChart = selectedCampaign.weeks.map((week) => ({
    week: week.label,
    expected: week.expected,
    actual: week.actual,
    incremental: week.incremental,
  }));

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Future simulator"
        title="Replay a real campaign, then bend the future"
        description="Campaigns are detected from the historical database by comparing actual sales against seasonal baseline. Change the levers and the prediction updates immediately."
        descriptionClassName="max-w-4xl"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[270px_minmax(0,1fr)_300px]">
        <div className="rounded-2xl border border-ink-300 bg-white p-3 shadow-card">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Past campaigns</p>
          <div className="space-y-2">
            {campaigns.map((campaign) => {
              const active = campaign.id === selectedCampaign.id;
              return (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => setSelectedId(campaign.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                    active ? 'border-brand-red bg-cream-50 text-ink-900' : 'border-ink-200 text-ink-600 hover:border-ink-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-semibold">{campaign.name}</p>
                      <p className="mt-0.5 text-[10px] text-ink-500">{campaign.period}</p>
                    </div>
                    <span className="text-[10px] font-bold text-success">{formatCurrency(campaign.generated, true)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-ink-500">
                    <span>{campaign.duration} weeks</span>
                    <span>+{formatPercent(campaign.liftPct, 0)}</span>
                    <span>football {campaign.peakFootball}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-300 bg-white p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-ink-900">{selectedCampaign.name}</p>
              <p className="text-[11px] text-ink-500">
                Generated {formatCurrency(selectedCampaign.generated, true)} vs baseline · best week {selectedCampaign.bestWeek}
              </p>
            </div>
            <div className="rounded-full border border-ink-200 bg-cream-50 px-2.5 py-1 text-[10px] font-semibold text-ink-600">
              £/Hl calibrated: {GBP_PER_HL.toFixed(1)}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-ink-200 bg-white p-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">How it worked historically</p>
              <div className="h-[225px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={historicalChart} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={currencyTick} tick={{ fontSize: 10, fill: '#6B7280' }} width={52} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, true)} contentStyle={{ borderRadius: 10, borderColor: '#E5E7EB', fontSize: 12 }} />
                    <Bar dataKey="incremental" fill="#16A34A" fillOpacity={0.18} radius={[4, 4, 0, 0]} />
                    <Line type="linear" dataKey="expected" stroke="#F59E0B" strokeDasharray="6 4" strokeWidth={2.1} dot={false} />
                    <Line type="linear" dataKey="actual" stroke="#0F172A" strokeWidth={2.6} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-ink-200 bg-white p-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Predicted future outcome</p>
              <div className="h-[225px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulation.futureWeeks} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="simUplift" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#15803D" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#15803D" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={currencyTick} tick={{ fontSize: 10, fill: '#6B7280' }} width={52} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, true)} contentStyle={{ borderRadius: 10, borderColor: '#E5E7EB', fontSize: 12 }} />
                    <ReferenceLine y={currentMonthTarget / 4.33} stroke="#DC2626" strokeDasharray="4 4" />
                    <Area type="linear" dataKey="predicted" stroke="#15803D" strokeWidth={2.4} fill="url(#simUplift)" dot={{ r: 3, fill: '#15803D' }} />
                    <Line type="linear" dataKey="noAction" stroke="#F59E0B" strokeDasharray="6 4" strokeWidth={2.1} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
            <Kpi label="Predicted lift" value={formatDelta(simulation.predictedImpact, true)} detail="gross incremental" tone="success" />
            <Kpi label="Net effect" value={formatDelta(simulation.netIncremental, true)} detail={`${formatCurrency(simulation.marginDrag, true)} margin drag`} tone={simulation.netIncremental >= 0 ? 'success' : 'danger'} />
            <Kpi label="Close forecast" value={formatCurrency(simulation.forecast, true)} detail={`${formatPercent((simulation.forecast / currentMonthTarget) * 100, 0)} of target`} tone={simulation.gap >= 0 ? 'success' : 'warning'} />
            <Kpi label="Gap" value={formatDelta(simulation.gap, true)} detail={`target ${formatCurrency(currentMonthTarget, true)}`} tone={simulation.gap >= 0 ? 'success' : 'warning'} />
            <Kpi label="ROI / hit" value={`${simulation.roi.toFixed(1)}x`} detail={`${simulation.hitProbability}% probability`} tone={simulation.roi >= 2.5 ? 'success' : 'neutral'} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-ink-300 bg-cream-50/70 p-3 shadow-card">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Prediction controls</p>
            <div className="space-y-2">
              <SliderControl
                icon={<WalletCards className="h-3.5 w-3.5" />}
                label="Investment"
                value={investment}
                min={45}
                max={125}
                suffix="%"
                onChange={setInvestment}
                onActivate={() => setActiveLever('investment')}
              />
              <SliderControl
                icon={<Percent className="h-3.5 w-3.5" />}
                label="Discount"
                value={discount}
                min={0}
                max={32}
                suffix="%"
                onChange={setDiscount}
                onActivate={() => setActiveLever('discount')}
              />
              <SliderControl
                icon={<Store className="h-3.5 w-3.5" />}
                label="Distribution"
                value={distribution}
                min={25}
                max={100}
                suffix="%"
                onChange={setDistribution}
                onActivate={() => setActiveLever('distribution')}
              />
              <SliderControl
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Duration"
                value={duration}
                min={1}
                max={7}
                suffix="w"
                onChange={setDuration}
                onActivate={() => setActiveLever('duration')}
              />
              <SliderControl
                icon={<Gauge className="h-3.5 w-3.5" />}
                label="Execution"
                value={execution}
                min={40}
                max={100}
                suffix="%"
                onChange={setExecution}
                onActivate={() => setActiveLever('execution')}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-ink-300 bg-white p-3 shadow-card">
            <div className="mb-1 flex items-center gap-2">
              <Route className="h-4 w-4 text-ink-500" />
              <p className="text-[12px] font-semibold text-ink-900">Live response curve</p>
            </div>
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-ink-500">
              <span>{simulation.activeConfig.label}</span>
              <span className="font-semibold text-ink-900">
                {simulation.currentPoint[0].value}
                {simulation.activeConfig.suffix}
              </span>
            </div>
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={simulation.responseSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="responseNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#15803D" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#15803D" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="value"
                    type="number"
                    domain={[simulation.activeConfig.min, simulation.activeConfig.max]}
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    tickFormatter={(value: number) => `${value}${simulation.activeConfig.suffix}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tickFormatter={currencyTick} tick={{ fontSize: 10, fill: '#6B7280' }} width={54} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value, true),
                      name === 'netIncremental' ? 'Net impact' : name === 'predictedImpact' ? 'Gross lift' : 'Close forecast',
                    ]}
                    labelFormatter={(value) => `${simulation.activeConfig.label}: ${value}${simulation.activeConfig.suffix}`}
                    contentStyle={{ borderRadius: 10, borderColor: '#E5E7EB', fontSize: 12 }}
                  />
                  <ReferenceLine x={simulation.currentPoint[0].value} stroke="#DC2626" strokeDasharray="4 4" />
                  <Area type="linear" dataKey="netIncremental" name="Net impact" stroke="#15803D" strokeWidth={2.4} fill="url(#responseNet)" dot={false} />
                  <Line type="linear" dataKey="predictedImpact" name="Gross lift" stroke="#0F172A" strokeWidth={1.9} strokeDasharray="5 4" dot={false} />
                  <Scatter data={simulation.currentPoint} dataKey="netIncremental" name="Current" fill="#DC2626" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
              La curva recalcula el escenario completo para el rango de la variable activa; si pasas el punto dulce, el impacto neto puede caer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
