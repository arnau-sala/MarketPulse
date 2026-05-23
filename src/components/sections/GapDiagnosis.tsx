import { gapDrivers, channelPerformance, brandPerformance } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatters';
import SectionHeader from '../common/SectionHeader';
import InsightCard from '../common/InsightCard';
import StatusBadge from '../common/StatusBadge';
import GapDriversChart from '../charts/GapDriversChart';
import ChannelMixChart from '../charts/ChannelMixChart';

const dimensionTone: Record<string, string> = {
  Channel:   'bg-blue-50   text-blue-700   border-blue-200',
  Brand:     'bg-purple-50 text-purple-700 border-purple-200',
  Promotion: 'bg-amber-50  text-amber-700  border-amber-200',
  Timing:    'bg-slate-50  text-slate-600  border-slate-200',
};

function impactShare(share: number) {
  if (share >= 40) return 'danger';
  if (share >= 20) return 'warning';
  return 'neutral';
}

export default function GapDiagnosis() {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="02 — Gap Diagnosis"
        title="What is driving the gap?"
        description="MarketPulse decomposes the expected gap into business drivers so the team knows where to act first."
      />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-ink-300/60 rounded-2xl shadow-card px-5 py-4">
          <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1">Total expected gap</p>
          <p className="text-2xl font-bold text-danger">-£120k</p>
          <p className="text-[11px] text-ink-500 mt-0.5">10% below March target</p>
        </div>
        <div className="bg-white border border-ink-300/60 rounded-2xl shadow-card px-5 py-4">
          <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1">Largest driver</p>
          <p className="text-[16px] font-bold text-ink-900">Off-Trade</p>
          <p className="text-[11px] text-ink-500 mt-0.5">43% of expected gap</p>
        </div>
        <div className="bg-white border border-ink-300/60 rounded-2xl shadow-card px-5 py-4">
          <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1">Drivers identified</p>
          <p className="text-2xl font-bold text-ink-900">{gapDrivers.length}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">Across channel, brand & promo</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-5 py-5">
        <p className="text-[13px] font-semibold text-ink-900 mb-4">Impact breakdown by driver</p>
        <GapDriversChart />
      </div>

      {/* Driver cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {gapDrivers.map((driver, i) => (
          <div key={i} className="bg-white border border-ink-300/60 rounded-2xl shadow-card px-5 py-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${dimensionTone[driver.dimension] ?? 'bg-ink-100 text-ink-600 border-ink-200'}`}>
                    {driver.dimension}
                  </span>
                  <StatusBadge
                    status={`${driver.share}% of gap`}
                    tone={impactShare(driver.share) as 'danger' | 'warning' | 'neutral'}
                    size="sm"
                  />
                </div>
                <p className="text-[14px] font-semibold text-ink-900">{driver.name}</p>
              </div>
              <p className="text-[18px] font-bold text-danger flex-shrink-0">
                {formatCurrency(driver.impact, true)}
              </p>
            </div>
            <p className="text-[12px] text-ink-500 leading-relaxed">{driver.explanation}</p>
            {/* mini bar */}
            <div className="mt-3 w-full h-1 bg-ink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-danger rounded-full transition-all duration-700"
                style={{ width: `${driver.share}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Channel performance */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-5 py-5">
        <p className="text-[13px] font-semibold text-ink-900 mb-1">Channel performance vs target</p>
        <p className="text-[12px] text-ink-500 mb-4">Sales to date by channel against the month-to-date target pace.</p>
        <ChannelMixChart />
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-ink-100">
          {channelPerformance.map((c) => (
            <div key={c.channel} className="text-center">
              <p className="text-[11px] text-ink-500 mb-0.5">{c.channel}</p>
              <p className={`text-[15px] font-bold ${c.gap < 0 ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(c.gap, true)}
              </p>
              <p className="text-[10px] text-ink-400">vs target</p>
            </div>
          ))}
        </div>
      </div>

      {/* Brand performance table */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-5 py-5">
        <p className="text-[13px] font-semibold text-ink-900 mb-4">Brand performance vs target</p>
        <div className="space-y-3">
          {brandPerformance.filter(b => b.brand !== 'Others').map((b) => (
            <div key={b.brand} className="flex items-center gap-4">
              <div className="w-36 flex-shrink-0">
                <p className="text-[12px] font-medium text-ink-900 truncate">{b.brand}</p>
                <p className="text-[10px] text-ink-400">{b.share}% mix</p>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-ink-500">{formatCurrency(b.actual, true)}</span>
                  <span className="text-ink-400">Target: {formatCurrency(b.target, true)}</span>
                </div>
                <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${b.gap < -20000 ? 'bg-danger' : b.gap < 0 ? 'bg-warning' : 'bg-success'}`}
                    style={{ width: `${Math.min((b.actual / b.target) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <span className={`text-[12px] font-semibold flex-shrink-0 w-14 text-right ${b.gap < 0 ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(b.gap, true)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Key takeaway */}
      <InsightCard title="Key takeaway" tone="danger">
        The gap is not evenly distributed: <strong>Off-Trade and Voll-Damm</strong> explain 69% of
        the expected underperformance. The recovery plan should therefore prioritise those areas first,
        focusing on Off-Trade channels during Week 3 when the promotional opportunity score peaks.
      </InsightCard>
    </div>
  );
}
