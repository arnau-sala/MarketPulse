import { TrendingDown, Target, DollarSign, BarChart2 } from 'lucide-react';
import { monthlyMetrics } from '../../data/mockData';
import { formatCurrency, progressValue } from '../../utils/formatters';
import SectionHeader from '../common/SectionHeader';
import MetricCard from '../common/MetricCard';
import InsightCard from '../common/InsightCard';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import SalesMomentumChart from '../charts/SalesMomentumChart';
import { useTargetPlan } from '../../context/TargetContext';

export default function ExecutivePulse() {
  const m = monthlyMetrics;
  const { currentMonthTarget } = useTargetPlan();
  const progress = progressValue(m.salesToDate, currentMonthTarget);
  const expectedGap = m.baselineForecast - currentMonthTarget;
  const balancedRecoveryForecast = m.baselineForecast + 136000;
  const balancedRecoveryGap = balancedRecoveryForecast - currentMonthTarget;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="01 — Executive Pulse"
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
    </div>
  );
}
