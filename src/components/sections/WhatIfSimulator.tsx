import { useState, useEffect } from 'react';
import { FlaskConical, ArrowRight, Loader2 } from 'lucide-react';
import { simulatorOptions, monthlyMetrics } from '../../data/mockData';
import { simulate as simulateApi } from '../../services/api';
import { simulate as simulateLocal, getScenarioExplanation } from '../../utils/simulator';
import { formatCurrency } from '../../utils/formatters';
import SectionHeader from '../common/SectionHeader';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import InsightCard from '../common/InsightCard';
import type { PromoIntensity, Channel, Brand, Week, Tone, SimulatorResult } from '../../types';

const baselineForecast = monthlyMetrics.baselineForecast;
const monthlyTarget    = monthlyMetrics.monthlyTarget;

function OptionButton<T extends string>({
  value, selected, onClick, children,
}: { value: T; selected: T; onClick: (v: T) => void; children: React.ReactNode }) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all duration-100 ${value === selected ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-700 border-ink-300 hover:border-ink-500'}`}
    >
      {children}
    </button>
  );
}

export default function WhatIfSimulator() {
  const [intensity, setIntensity] = useState<PromoIntensity>('Medium');
  const [channel,   setChannel]   = useState<Channel>('Off-Trade');
  const [brand,     setBrand]     = useState<Brand>('Estrella Damm');
  const [week,      setWeek]      = useState<Week>('Week 3');

  const [result, setResult]   = useState<SimulatorResult & { explanation?: string }>(
    () => simulateLocal(intensity, channel, brand, week)
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    simulateApi(intensity, channel, brand, week)
      .then(r => { if (!cancelled) setResult(r); })
      .catch(() => {
        // Backend unavailable — use local calculation
        const local = simulateLocal(intensity, channel, brand, week);
        if (!cancelled) setResult({
          ...local,
          explanation: getScenarioExplanation(channel, week, brand, local),
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [intensity, channel, brand, week]);

  const gapTone: Tone = result.remainingGap >= 0 ? 'success' : result.remainingGap > -40000 ? 'warning' : 'danger';
  const probTone: Tone = result.hitProbability >= 70 ? 'success' : result.hitProbability >= 50 ? 'warning' : 'danger';
  const delta = result.newForecast - baselineForecast;
  const probDelta = result.hitProbability - 34;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="05 — What-if Simulator"
        title="What happens if we change the plan?"
        description="Simulate the commercial impact of promotion intensity, channel focus, brand focus and activation week."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-6 space-y-6">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-ink-500" />
            <p className="text-[13px] font-semibold text-ink-900">Scenario inputs</p>
            {loading && <Loader2 size={12} className="animate-spin text-ink-400 ml-auto" />}
          </div>

          {([
            { label: 'Promotion intensity', values: simulatorOptions.intensities, current: intensity, set: setIntensity },
            { label: 'Channel focus',       values: simulatorOptions.channels,    current: channel,   set: setChannel   },
            { label: 'Brand focus',         values: simulatorOptions.brands,      current: brand,     set: setBrand     },
            { label: 'Activation week',     values: simulatorOptions.weeks,       current: week,      set: setWeek      },
          ] as Array<{ label: string; values: string[]; current: string; set: (v: string) => void }>).map(({ label, values, current, set }) => (
            <div key={label}>
              <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-2">{label}</p>
              <div className="flex gap-2 flex-wrap">
                {values.map(v => (
                  <OptionButton key={v} value={v} selected={current} onClick={set as (v: string) => void}>{v}</OptionButton>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-ink-100">
            <div className="flex items-center gap-2 text-[12px] text-ink-500 flex-wrap">
              {[intensity, channel, brand, week].map((v, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="bg-ink-100 px-2 py-0.5 rounded font-medium text-ink-700">{v}</span>
                  {i < 3 && <ArrowRight size={12} />}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-5">
            <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Simulated forecast</p>
            <div className="flex items-end gap-3">
              <p className="text-[36px] font-bold text-ink-900 leading-none">{formatCurrency(result.newForecast, true)}</p>
              <p className="text-[14px] text-success font-semibold mb-1">+{formatCurrency(delta, true)}</p>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-500">vs target of {formatCurrency(monthlyTarget, true)}</span>
                <span className="font-semibold text-ink-700">{((result.newForecast / monthlyTarget) * 100).toFixed(0)}%</span>
              </div>
              <ProgressBar value={result.newForecast} max={monthlyTarget} tone={result.newForecast >= monthlyTarget ? 'success' : 'warning'} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Remaining gap</p>
                <p className={`text-[22px] font-bold ${result.remainingGap >= 0 ? 'text-success' : 'text-warning'}`}>
                  {result.remainingGap >= 0 ? `+${formatCurrency(result.remainingGap, true)}` : formatCurrency(result.remainingGap, true)}
                </p>
              </div>
              <StatusBadge status={result.remainingGap >= 0 ? 'On Track' : 'At Risk'} tone={gapTone} size="md" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Hit probability</p>
                <p className={`text-[28px] font-bold leading-none ${probTone === 'success' ? 'text-success' : probTone === 'warning' ? 'text-warning' : 'text-danger'}`}>{result.hitProbability}%</p>
                <p className="text-[11px] text-ink-400 mt-0.5">{probDelta >= 0 ? '+' : ''}{probDelta.toFixed(0)}pp vs baseline (34%)</p>
              </div>
              <div className="w-24">
                <ProgressBar value={result.hitProbability} max={100} tone={probTone === 'neutral' ? 'warning' : probTone as 'success' | 'warning' | 'danger'} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-4">
            <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Expected incremental impact</p>
            <p className="text-[22px] font-bold text-success">+{formatCurrency(result.incrementalImpact, true)}</p>
            <p className="text-[11px] text-ink-400 mt-0.5">vs baseline forecast of {formatCurrency(baselineForecast, true)}</p>
          </div>
        </div>
      </div>

      {/* Dynamic explanation */}
      {'explanation' in result && result.explanation && (
        <InsightCard title="Scenario explanation" tone={result.remainingGap >= 0 ? 'success' : 'warning'}>
          {result.explanation}
        </InsightCard>
      )}

      {/* Comparison table */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-5">
        <p className="text-[13px] font-semibold text-ink-900 mb-4">Scenario comparison</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-ink-100">
                {['Scenario','Forecast','Gap','Probability'].map(h => (
                  <th key={h} className={`pb-2 text-[11px] font-semibold text-ink-500 uppercase tracking-wide ${h === 'Scenario' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              <tr>
                <td className="py-2.5 text-ink-500">Baseline (no action)</td>
                <td className="py-2.5 text-right font-medium text-ink-900">{formatCurrency(baselineForecast, true)}</td>
                <td className="py-2.5 text-right font-semibold text-danger">-£120k</td>
                <td className="py-2.5 text-right font-medium text-ink-700">34%</td>
              </tr>
              <tr>
                <td className="py-2.5 text-ink-700 font-medium">Balanced Recovery (recommended)</td>
                <td className="py-2.5 text-right font-medium text-ink-900">£1.22M</td>
                <td className="py-2.5 text-right font-semibold text-success">+£16k</td>
                <td className="py-2.5 text-right font-medium text-success">74%</td>
              </tr>
              <tr className="bg-ink-50/50">
                <td className="py-2.5 text-ink-900 font-semibold">
                  <span className="flex items-center gap-1.5"><FlaskConical size={12} className="text-ink-500" />This scenario</span>
                </td>
                <td className="py-2.5 text-right font-bold text-ink-900">{formatCurrency(result.newForecast, true)}</td>
                <td className={`py-2.5 text-right font-bold ${result.remainingGap >= 0 ? 'text-success' : 'text-warning'}`}>
                  {result.remainingGap >= 0 ? '+' : ''}{formatCurrency(result.remainingGap, true)}
                </td>
                <td className={`py-2.5 text-right font-bold ${result.hitProbability >= 70 ? 'text-success' : 'text-warning'}`}>{result.hitProbability}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
