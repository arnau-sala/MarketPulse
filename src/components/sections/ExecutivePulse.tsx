import { useState } from 'react';
import {
  TrendingDown,
  Target,
  DollarSign,
  BarChart2,
  Sparkles,
  Loader2,
  Brain,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  DEMO_MONTH_LABEL,
  DEMO_BASELINE_FORECAST_GBP,
  DEMO_SALES_TO_DATE_GBP,
  DEMO_HIT_PROBABILITY,
  DEMO_BALANCED_IMPACT_GBP,
} from '../../config/demoConfig';
import { formatCurrency, progressValue } from '../../utils/formatters';
import SectionHeader from '../common/SectionHeader';
import MetricCard from '../common/MetricCard';
import InsightCard from '../common/InsightCard';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import SalesMomentumChart from '../charts/SalesMomentumChart';
import { useTargetPlan } from '../../context/TargetContext';
import { generateBriefing } from '../../services/api';

// ─── Gap bridge waterfall data ─────────────────────────────────────────────
// Each entry: base = invisible stack base, value = visible amount, color = bar fill
const ACTION_IMPACTS = [
  { label: 'Off-Trade push', amount: 58000 },
  { label: 'Promo pull-fwd', amount: 46000 },
  { label: 'SKU-128 push', amount: 32000 },
];

function buildBridgeData(monthlyTarget: number) {
  const baseline = DEMO_BASELINE_FORECAST_GBP;
  const entries: Array<{ label: string; base: number; value: number; isTotal: boolean; color: string }> = [
    { label: 'Target', base: 0, value: monthlyTarget, isTotal: true, color: '#7c3aed' },
    { label: 'Baseline', base: 0, value: baseline, isTotal: true, color: '#f59e0b' },
  ];

  let running = baseline;
  for (const a of ACTION_IMPACTS) {
    entries.push({ label: a.label, base: running, value: a.amount, isTotal: false, color: '#22c55e' });
    running += a.amount;
  }

  entries.push({ label: 'After Plan', base: 0, value: running, isTotal: true, color: '#16a34a' });
  return entries;
}

// Custom tooltip
function BridgeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-elevated px-3 py-2 text-[12px]">
      <p className="font-semibold text-ink-900 mb-0.5">{label}</p>
      <p className="text-ink-700">{formatCurrency(d.value, true)}</p>
      {!d.isTotal && d.base > 0 && (
        <p className="text-ink-400">Base: {formatCurrency(d.base, true)}</p>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function ExecutivePulse() {
  const { currentMonthTarget } = useTargetPlan();
  const progress = progressValue(DEMO_SALES_TO_DATE_GBP, currentMonthTarget);
  const expectedGap = DEMO_BASELINE_FORECAST_GBP - currentMonthTarget;
  const balancedForecast = DEMO_BASELINE_FORECAST_GBP + DEMO_BALANCED_IMPACT_GBP;
  const bridgeData = buildBridgeData(currentMonthTarget);

  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingModel, setBriefingModel] = useState('');

  const handleGenerateBriefing = async () => {
    setBriefingLoading(true);
    setBriefing(null);
    try {
      const res = await generateBriefing({
        month: DEMO_MONTH_LABEL,
        salesToDate: DEMO_SALES_TO_DATE_GBP,
        monthlyTarget: currentMonthTarget,
        expectedGap,
        status: 'At Risk',
        topGapDriver: 'Off-Trade underperformance (43% of gap)',
        recommendedAction: 'Activate Balanced Recovery plan in Week 3',
      });
      setBriefing(res.text);
      setBriefingModel(res.model);
    } catch {
      setBriefing(
        'El servicio de briefing no está disponible. Asegúrate de que el backend está activo y GROQ_API_KEY está configurada en backend/.env.',
      );
    } finally {
      setBriefingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Will UK hit the ${DEMO_MONTH_LABEL} target?`}
        description="Real-time view of monthly performance, forecast close and commercial risk."
      />

      {/* Status banner */}
      <div className="bg-danger-light/60 border border-danger/20 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status="At Risk" tone="danger" size="lg" />
          </div>
          <p className="text-[15px] font-semibold text-ink-900 mt-2">
            At current pace, UK is projected to close{' '}
            <span className="text-danger">10% below target</span> in {DEMO_MONTH_LABEL}.
          </p>
          <p className="text-[13px] text-ink-500 mt-1">
            Baseline forecast: {formatCurrency(DEMO_BASELINE_FORECAST_GBP, true)} vs target:{' '}
            {formatCurrency(currentMonthTarget, true)} — gap of{' '}
            {formatCurrency(expectedGap, true)}.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[42px] font-bold text-danger leading-none">{DEMO_HIT_PROBABILITY}%</p>
          <p className="text-[12px] text-ink-500 mt-1">Probability to hit target</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Sales to date"
          value={formatCurrency(DEMO_SALES_TO_DATE_GBP, true)}
          subtitle={`${progress.toFixed(0)}% of monthly target`}
          tone="neutral"
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          title="Monthly target"
          value={formatCurrency(currentMonthTarget, true)}
          subtitle={`${DEMO_MONTH_LABEL} objective`}
          tone="neutral"
          icon={<Target size={16} />}
        />
        <MetricCard
          title="Forecasted close"
          value={formatCurrency(DEMO_BASELINE_FORECAST_GBP, true)}
          delta={`${formatCurrency(expectedGap, true)} vs target`}
          tone="warning"
          icon={<BarChart2 size={16} />}
        />
        <MetricCard
          title="Expected gap"
          value={formatCurrency(expectedGap, true)}
          delta={`${(Math.abs(expectedGap) / currentMonthTarget * 100).toFixed(0)}% below target`}
          tone="danger"
          icon={<TrendingDown size={16} />}
        />
      </div>

      {/* Progress bars */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-5 py-4 space-y-4">
        <p className="text-[12px] font-semibold text-ink-500 uppercase tracking-wider">Monthly progress</p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-ink-700 font-medium">Sales to date</span>
              <span className="text-[12px] font-semibold text-ink-900">{formatCurrency(DEMO_SALES_TO_DATE_GBP, true)}</span>
            </div>
            <ProgressBar value={DEMO_SALES_TO_DATE_GBP} max={currentMonthTarget} tone="warning" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-ink-700 font-medium">Baseline forecast</span>
              <span className="text-[12px] font-semibold text-warning">{formatCurrency(DEMO_BASELINE_FORECAST_GBP, true)}</span>
            </div>
            <ProgressBar value={DEMO_BASELINE_FORECAST_GBP} max={currentMonthTarget} tone="warning" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-ink-700 font-medium">
                After Balanced Recovery plan
                <span className="ml-2 text-[10px] bg-success-light text-success px-1.5 py-0.5 rounded-full font-semibold">
                  +{formatCurrency(DEMO_BALANCED_IMPACT_GBP, true)}
                </span>
              </span>
              <span className="text-[12px] font-semibold text-success">{formatCurrency(balancedForecast, true)}</span>
            </div>
            <ProgressBar value={balancedForecast} max={currentMonthTarget} tone="success" />
          </div>
          <div className="pt-1 border-t border-ink-100">
            <div className="flex justify-between">
              <span className="text-[11px] text-ink-500">Monthly target</span>
              <span className="text-[11px] font-bold text-ink-900">{formatCurrency(currentMonthTarget, true)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gap Bridge Waterfall */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-5 py-5">
        <p className="text-[13px] font-semibold text-ink-900 mb-1">Gap bridge — from baseline to target</p>
        <p className="text-[12px] text-ink-500 mb-4">
          How the Balanced Recovery plan closes the £120k gap through three coordinated actions.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={bridgeData} barCategoryGap="20%">
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              domain={[900000, 1300000]}
            />
            <Tooltip content={<BridgeTooltip />} />
            <ReferenceLine
              y={currentMonthTarget}
              stroke="#7c3aed"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: 'Target', position: 'right', fontSize: 10, fill: '#7c3aed' }}
            />
            {/* Invisible base bar */}
            <Bar dataKey="base" stackId="bridge" fill="transparent" />
            {/* Visible value bar */}
            <Bar dataKey="value" stackId="bridge" radius={[4, 4, 0, 0]}>
              {bridgeData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center flex-wrap">
          {[
            { color: '#7c3aed', label: 'Target' },
            { color: '#f59e0b', label: 'Baseline forecast' },
            { color: '#22c55e', label: 'Action impact' },
            { color: '#16a34a', label: 'Forecast after plan' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
              <span className="text-[10px] text-ink-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <SalesMomentumChart />

      {/* Insight */}
      <InsightCard title="Executive insight" tone="warning">
        The expected gap is mainly driven by <strong>Off-Trade underperformance</strong> (43% of gap),
        a <strong>brand slowdown in premium segment</strong> (26%), and weaker-than-expected
        promotional uplift from current mechanics (20%).{' '}
        <strong>Week 3 is the strongest recovery window</strong> with an opportunity score of 87/100.
      </InsightCard>

      {/* Director's Briefing */}
      <div className="rounded-2xl border border-amber-200/80 shadow-card overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200/60 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Sparkles size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-ink-900">Director's Briefing</p>
              <p className="text-[11px] text-amber-700/80 font-medium">AI-generated commercial analysis in real time</p>
            </div>
          </div>
          <button
            onClick={handleGenerateBriefing}
            disabled={briefingLoading}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[12px] font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            {briefingLoading ? (
              <><Loader2 size={13} className="animate-spin" /> Generating…</>
            ) : (
              <><Sparkles size={13} /> Generate</>
            )}
          </button>
        </div>

        <div className="bg-white px-5 py-5">
          {briefing ? (
            <BriefingContent text={briefing} model={briefingModel} />
          ) : briefingLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-ink-400">
              <Loader2 size={24} className="animate-spin text-amber-500" />
              <p className="text-[13px] font-medium">Analysing UK data…</p>
              <p className="text-[11px] text-ink-400">The model is processing sales, forecasts and action plans.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Brain size={22} className="text-amber-500" />
              </div>
              <p className="text-[13px] font-semibold text-ink-700">Ready to generate your briefing</p>
              <p className="text-[12px] text-ink-400 max-w-sm">
                Press <strong>Generate</strong> to get a concise executive summary based on this month's real data.
              </p>
            </div>
          )}
        </div>

        <div className="bg-ink-50/60 border-t border-ink-200/40 px-5 py-3">
          <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-2">How we compute the expected gain</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-ink-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain size={11} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink-700">LightGBM model</p>
                <p className="text-[10px] text-ink-400 leading-snug">Trained on 175 weeks of real UK sales (2022–2026)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-success flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp size={11} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink-700">Promo uplift</p>
                <p className="text-[10px] text-ink-400 leading-snug">+32% calibrated on 18 promo weeks 2026 × Off-Trade 1.08× multiplier</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-warning flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar size={11} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink-700">Optimal window</p>
                <p className="text-[10px] text-ink-400 leading-snug">Week 3 = 1.32× demand (UK payday peak) → £66k incremental impact</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Briefing content renderer ─────────────────────────────────────────────

function renderInline(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-ink-900 font-semibold">{part}</strong>
    ) : (
      part
    ),
  );
}

function BriefingContent({ text, model }: { text: string; model: string }) {
  const sentences = text.split(/(?<=\.)\s+/).filter(Boolean);
  const paras: string[][] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paras.push(sentences.slice(i, i + 2));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <span className="text-[48px] leading-none text-amber-300 font-serif select-none -mt-2 flex-shrink-0">&ldquo;</span>
        <div className="space-y-3 flex-1">
          {paras.map((para, i) => (
            <p key={i} className="text-[14px] text-ink-700 leading-relaxed">
              {para.map((s, j) => (
                <span key={j}>
                  {renderInline(s)}
                  {j < para.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>

      {model && (
        <div className="flex items-center gap-2 pt-2 border-t border-ink-100">
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/60 rounded-full px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Sparkles size={9} /> {model}
          </span>
          <span className="text-[10px] text-ink-400">
            {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  );
}
