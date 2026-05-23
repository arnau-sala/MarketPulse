import { useState } from 'react';
import { CheckCircle2, Star, TrendingUp, AlertTriangle, Shield } from 'lucide-react';
import { actionPlans } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatters';
import SectionHeader from '../common/SectionHeader';
import InsightCard from '../common/InsightCard';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import type { ActionPlan, Tone } from '../../types';

const riskTone: Record<string, Tone> = {
  Low:    'success',
  Medium: 'warning',
  High:   'danger',
};

const riskIcon: Record<string, React.ReactNode> = {
  Low:    <Shield size={14} />,
  Medium: <AlertTriangle size={14} />,
  High:   <TrendingUp size={14} />,
};

function confidenceLabel(c: number) {
  if (c >= 80) return { label: 'High confidence', tone: 'success' as Tone };
  if (c >= 65) return { label: 'Medium confidence', tone: 'warning' as Tone };
  return { label: 'Lower confidence', tone: 'neutral' as Tone };
}

export default function ActionPlanner() {
  const defaultPlan = actionPlans.find((p) => p.recommended)?.id ?? actionPlans[0].id;
  const [selectedId, setSelectedId] = useState<string>(defaultPlan);
  const selected: ActionPlan = actionPlans.find((p) => p.id === selectedId) ?? actionPlans[0];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="What should we do now?"
        description="Recommended commercial recovery plans ranked by impact, confidence and execution risk."
      />

      {/* Plan selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actionPlans.map((plan) => {
          const isActive = plan.id === selectedId;
          return (
            <button
              key={plan.id}
              onClick={() => setSelectedId(plan.id)}
              className={`
                relative text-left rounded-2xl border px-5 py-4 transition-all duration-150 cursor-pointer
                ${isActive
                  ? 'border-ink-900 bg-ink-900 shadow-elevated text-white'
                  : 'border-ink-300/60 bg-white shadow-card text-ink-900 hover:border-ink-400 hover:shadow-card-hover'
                }
              `}
            >
              {plan.recommended && (
                <div className={`absolute -top-2.5 left-4 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${isActive ? 'bg-warning text-white' : 'bg-warning-light text-warning'}`}>
                  <Star size={8} fill="currentColor" />
                  Recommended
                </div>
              )}
              <p className={`text-[13px] font-bold leading-tight ${isActive ? 'text-white' : 'text-ink-900'}`}>
                {plan.name}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  isActive
                    ? riskTone[plan.risk] === 'success' ? 'bg-success-light/20 text-success-light border-success/40'
                      : riskTone[plan.risk] === 'warning' ? 'bg-warning-light/20 text-warning-light border-warning/40'
                      : 'bg-danger-light/20 text-danger-light border-danger/40'
                    : riskTone[plan.risk] === 'success' ? 'bg-success-light text-success border-success/20'
                      : riskTone[plan.risk] === 'warning' ? 'bg-warning-light text-warning border-warning/20'
                      : 'bg-danger-light text-danger border-danger/20'
                }`}>
                  {plan.risk} risk
                </span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between">
                  <span className={`text-[11px] ${isActive ? 'text-white/60' : 'text-ink-500'}`}>Expected impact</span>
                  <span className={`text-[12px] font-semibold ${isActive ? 'text-white' : 'text-success'}`}>
                    +{formatCurrency(plan.expectedImpact, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-[11px] ${isActive ? 'text-white/60' : 'text-ink-500'}`}>Hit probability</span>
                  <span className={`text-[12px] font-semibold ${isActive ? 'text-white' : 'text-ink-900'}`}>
                    {plan.hitProbability}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected plan detail */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-6 space-y-5">
        {/* Plan header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-[18px] font-bold text-ink-900">{selected.name}</h2>
              {selected.recommended && <StatusBadge status="Recommended" tone="warning" size="sm" />}
            </div>
            <p className="text-[13px] text-ink-500">{selected.explanation}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[28px] font-bold text-success leading-none">
              +{formatCurrency(selected.expectedImpact, true)}
            </p>
            <p className="text-[11px] text-ink-500 mt-0.5">Expected incremental impact</p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-ink-100">
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Forecast after</p>
            <p className="text-[16px] font-bold text-ink-900">{formatCurrency(selected.forecastAfterAction, true)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Remaining gap</p>
            <p className={`text-[16px] font-bold ${selected.remainingGap >= 0 ? 'text-success' : 'text-warning'}`}>
              {selected.remainingGap >= 0 ? `+${formatCurrency(selected.remainingGap, true)}` : formatCurrency(selected.remainingGap, true)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Hit probability</p>
            <p className="text-[16px] font-bold text-ink-900">{selected.hitProbability}%</p>
            <ProgressBar value={selected.hitProbability} max={100} tone={selected.hitProbability >= 70 ? 'success' : 'warning'} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Execution risk</p>
            <div className="flex items-center gap-1 mt-1">
              <span className={riskTone[selected.risk] === 'success' ? 'text-success' : riskTone[selected.risk] === 'warning' ? 'text-warning' : 'text-danger'}>
                {riskIcon[selected.risk]}
              </span>
              <span className={`text-[14px] font-bold ${riskTone[selected.risk] === 'success' ? 'text-success' : riskTone[selected.risk] === 'warning' ? 'text-warning' : 'text-danger'}`}>
                {selected.risk}
              </span>
            </div>
          </div>
        </div>

        {/* Actions list */}
        <div className="space-y-3 pt-2 border-t border-ink-100">
          <p className="text-[12px] font-semibold text-ink-500 uppercase tracking-wider">Actions in this plan</p>
          {selected.actions.map((action, i) => {
            const conf = confidenceLabel(action.confidence);
            return (
              <div key={i} className="bg-cream-100 rounded-xl px-4 py-4 border border-ink-200/60">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-ink-900 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-ink-900">{action.title}</p>
                      <span className="text-[10px] bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded font-medium border border-ink-200">
                        {action.week}
                      </span>
                      <StatusBadge status={conf.label} tone={conf.tone} size="sm" />
                    </div>
                    <p className="text-[12px] text-ink-500 leading-relaxed">{action.why}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[16px] font-bold text-success">+{formatCurrency(action.impact, true)}</p>
                    <p className="text-[10px] text-ink-400">{action.confidence}% confidence</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why this plan? */}
      <InsightCard title="Why this plan?" tone="neutral">
        {selected.id === 'balanced' ? (
          <>
            This plan prioritises <strong>Off-Trade because it explains the largest share of the gap</strong>.
            It activates during <strong>Week 3, the strongest demand window</strong>, and pulls one planned
            promotion into the current month to improve closing probability. The three actions are
            coordinated to avoid execution conflicts and can be briefed to the field team within 48 hours.
          </>
        ) : selected.id === 'conservative' ? (
          <>
            This plan focuses on a <strong>single high-confidence lever</strong> — Estrella Damm push in
            Off-Trade — to reduce the gap by approximately 50% with minimal execution complexity and low
            budget risk. Best suited when the team has limited capacity.
          </>
        ) : (
          <>
            This plan adds an <strong>Online flash activation for Estrella Daura</strong> to capture the
            health-conscious segment alongside the core Off-Trade push. Higher potential upside but requires
            cross-functional coordination across trade marketing and digital media within tight timelines.
          </>
        )}
      </InsightCard>
    </div>
  );
}
