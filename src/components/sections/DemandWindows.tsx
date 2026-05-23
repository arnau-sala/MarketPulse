import { useDemandWindows } from '../../hooks/useMarketPulse';
import SectionHeader from '../common/SectionHeader';
import InsightCard from '../common/InsightCard';
import StatusBadge from '../common/StatusBadge';
import OpportunityChart from '../charts/OpportunityChart';
import type { Tone } from '../../types';

const recommendationTone: Record<string, Tone> = {
  Maintain: 'neutral', Monitor: 'neutral', Activate: 'success', 'Tactical Push': 'warning',
};
const demandColor: Record<string, string> = {
  High: 'text-success bg-success-light', Medium: 'text-warning bg-warning-light', Low: 'text-ink-500 bg-ink-100',
};
const scoreColor = (s: number) => s >= 80 ? 'text-success' : s >= 60 ? 'text-warning' : 'text-ink-500';
const scoreBg    = (s: number) => s >= 80 ? 'bg-success'  : s >= 60 ? 'bg-warning'  : 'bg-ink-300';

export default function DemandWindows() {
  const { data: windows } = useDemandWindows();
  const best = windows.reduce((a, b) => a.opportunityScore > b.opportunityScore ? a : b, windows[0]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="03 — Demand Windows"
        title="When should we act?"
        description="The best week is not always the week with the highest demand. MarketPulse identifies where commercial action can create the highest incremental impact."
      />

      {best && (
        <div className="bg-success-light/60 border border-success/20 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <span className="text-[11px] font-bold text-success uppercase tracking-widest">★ Best action window</span>
            <p className="text-[18px] font-bold text-ink-900 mt-1">{best.week}</p>
            <p className="text-[13px] text-ink-600 mt-1">{best.explanation}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[48px] font-bold text-success leading-none">{best.opportunityScore}</p>
            <p className="text-[11px] text-ink-500 mt-0.5">Opportunity score / 100</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {windows.map((w, i) => {
          const isBest = w.week === best?.week;
          return (
            <div key={i} className={`bg-white rounded-2xl border shadow-card px-5 py-5 flex flex-col gap-3 relative overflow-hidden ${isBest ? 'border-success/30 ring-1 ring-success/20' : 'border-ink-300/60'}`}>
              {isBest && (
                <div className="absolute top-0 right-0 bg-success text-white text-[9px] font-bold px-2 py-1 rounded-bl-xl uppercase tracking-wide">Best</div>
              )}
              <div>
                <p className="text-[13px] font-bold text-ink-900">{w.week}</p>
                <div className="mt-2"><StatusBadge status={w.recommendation} tone={recommendationTone[w.recommendation]} size="sm" /></div>
              </div>
              <div className="text-center py-1">
                <p className={`text-[40px] font-bold leading-none ${scoreColor(w.opportunityScore)}`}>{w.opportunityScore}</p>
                <p className="text-[10px] text-ink-400 mt-0.5">Opportunity score</p>
                <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full transition-all duration-700 ${scoreBg(w.opportunityScore)}`} style={{ width: `${w.opportunityScore}%` }} />
                </div>
              </div>
              <div className="space-y-1.5 border-t border-ink-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-500">Baseline demand</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${demandColor[w.baselineDemand]}`}>{w.baselineDemand}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-500">Promo sensitivity</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${demandColor[w.promoSensitivity]}`}>{w.promoSensitivity}</span>
                </div>
              </div>
              <p className="text-[11px] text-ink-500 leading-snug border-t border-ink-100 pt-3">{w.explanation}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-5 py-5">
        <p className="text-[13px] font-semibold text-ink-900 mb-4">Opportunity score by week</p>
        <OpportunityChart data={windows} />
      </div>

      <InsightCard title="Timing insight" tone="success">
        <strong>Week 3 combines high demand, high promotional sensitivity and enough lead-time</strong> to
        affect the monthly closing forecast. It is the strongest and most reliable window for
        commercial activation. Week 4 is a secondary opportunity for tactical pushes if Week 3
        actions need reinforcement.
      </InsightCard>
    </div>
  );
}
