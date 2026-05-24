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
import { monthlyMetrics } from '../../data/mockData';
import { formatCurrency, progressValue } from '../../utils/formatters';
import SectionHeader from '../common/SectionHeader';
import MetricCard from '../common/MetricCard';
import InsightCard from '../common/InsightCard';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import SalesMomentumChart from '../charts/SalesMomentumChart';
import { useTargetPlan } from '../../context/TargetContext';
import { generateBriefing } from '../../services/api';

export default function ExecutivePulse() {
  const m = monthlyMetrics;
  const { currentMonthTarget } = useTargetPlan();
  const progress = progressValue(m.salesToDate, currentMonthTarget);
  const expectedGap = m.baselineForecast - currentMonthTarget;
  const balancedRecoveryForecast = m.baselineForecast + 136000;

  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingModel, setBriefingModel] = useState('');

  const handleGenerateBriefing = async () => {
    setBriefingLoading(true);
    setBriefing(null);
    try {
      const res = await generateBriefing({
        month: m.month,
        salesToDate: m.salesToDate,
        monthlyTarget: currentMonthTarget,
        expectedGap,
        status: m.status,
        topGapDriver: 'Off-Trade underperformance',
        recommendedAction: 'Activate Balanced Recovery plan in Week 3',
      });
      setBriefing(res.text);
      setBriefingModel(res.model);
    } catch {
      setBriefing(
        'The briefing service is currently unavailable. Make sure the backend is running and GROQ_API_KEY is set in backend/.env.',
      );
    } finally {
      setBriefingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Will UK hit the March target?"
        description="A real-time view of monthly performance, forecasted close and commercial risk."
      />

      {/* Status banner */}
      <div className="bg-danger-light/60 border border-danger/20 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status="At Risk" tone="danger" size="lg" />
          </div>
          <p className="text-[15px] font-semibold text-ink-900 mt-2">
            At current pace, UK is projected to close{' '}
            <span className="text-danger">10% below target</span> in March 2025.
          </p>
          <p className="text-[13px] text-ink-500 mt-1">
            Baseline forecast: {formatCurrency(m.baselineForecast, true)} vs target: {formatCurrency(currentMonthTarget, true)} — gap of {formatCurrency(expectedGap, true)}.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[42px] font-bold text-danger leading-none">{m.hitProbability}%</p>
          <p className="text-[12px] text-ink-500 mt-1">Probability to hit target</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Sales to date"
          value={formatCurrency(m.salesToDate, true)}
          subtitle={`${progress.toFixed(0)}% of monthly target`}
          tone="neutral"
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          title="Monthly target"
          value={formatCurrency(currentMonthTarget, true)}
          subtitle="March 2025 objective"
          tone="neutral"
          icon={<Target size={16} />}
        />
        <MetricCard
          title="Forecasted close"
          value={formatCurrency(m.baselineForecast, true)}
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
              <span className="text-[12px] font-semibold text-ink-900">{formatCurrency(m.salesToDate, true)}</span>
            </div>
            <ProgressBar value={m.salesToDate} max={currentMonthTarget} tone="warning" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-ink-700 font-medium">Baseline forecast</span>
              <span className="text-[12px] font-semibold text-warning">{formatCurrency(m.baselineForecast, true)}</span>
            </div>
            <ProgressBar value={m.baselineForecast} max={currentMonthTarget} tone="warning" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-ink-700 font-medium">
                After Balanced Recovery plan
                <span className="ml-2 text-[10px] bg-success-light text-success px-1.5 py-0.5 rounded-full font-semibold">+£136k</span>
              </span>
              <span className="text-[12px] font-semibold text-success">{formatCurrency(balancedRecoveryForecast, true)}</span>
            </div>
            <ProgressBar value={balancedRecoveryForecast} max={currentMonthTarget} tone="success" />
          </div>
          <div className="pt-1 border-t border-ink-100">
            <div className="flex justify-between">
              <span className="text-[11px] text-ink-500">Monthly target</span>
              <span className="text-[11px] font-bold text-ink-900">{formatCurrency(currentMonthTarget, true)}</span>
            </div>
          </div>
        </div>
      </div>

      <SalesMomentumChart />

      {/* Insight */}
      <InsightCard title="Executive insight" tone="warning">
        The expected gap is mainly driven by <strong>Off-Trade underperformance</strong> (43% of gap),
        a <strong>Voll-Damm slowdown</strong> in premium segment (26%), and weaker-than-expected
        promotional uplift from current mechanics (20%).{' '}
        <strong>Week 3 is the strongest recovery window</strong> with an opportunity score of 87/100.
      </InsightCard>

      {/* Director's Briefing — Groq LLM */}
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
              <>
                <Loader2 size={13} className="animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles size={13} /> Generate
              </>
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
                Press <strong>Generate</strong> to obtain a concise executive summary based on this month's real data.
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

// ─── Briefing content renderer ──────────────────────────────────────────────
// Parses **bold** markdown from Groq output into structured paragraphs.

function renderInline(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-ink-900 font-semibold">
        {part}
      </strong>
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
