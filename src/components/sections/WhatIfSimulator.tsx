import { useEffect, useRef, useState } from 'react';
import { FlaskConical, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { simulatorOptions } from '../../data/mockData';
import { simulate, getScenarioExplanation } from '../../utils/simulator';
import { runSimulate } from '../../services/marketPulseApi';
import { formatCurrency } from '../../utils/formatters';
import SectionHeader from '../common/SectionHeader';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import InsightCard from '../common/InsightCard';
import type { PromoIntensity, Channel, Brand, Week, Tone, SimulatorResult } from '../../types';
import { useTargetPlan } from '../../context/TargetContext';
import {
  DEMO_BASELINE_FORECAST_GBP,
} from '../../config/demoConfig';

const BASE_PROBABILITY = 34;

function OptionButton<T extends string>({
  value,
  selected,
  onClick,
  children,
}: {
  value: T;
  selected: T;
  onClick: (v: T) => void;
  children: React.ReactNode;
}) {
  const isActive = value === selected;
  return (
    <button
      onClick={() => onClick(value)}
      className={`
        px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all duration-100
        ${isActive
          ? 'bg-ink-900 text-white border-ink-900'
          : 'bg-white text-ink-700 border-ink-300 hover:border-ink-500'
        }
      `}
    >
      {children}
    </button>
  );
}

export default function WhatIfSimulator() {
  const { currentMonthTarget } = useTargetPlan();
  const [intensity, setIntensity] = useState<PromoIntensity>('Medium');
  const [channel,   setChannel]   = useState<Channel>('Off-Trade');
  const [brand,     setBrand]     = useState<Brand>('Estrella Damm');
  const [week,      setWeek]      = useState<Week>('Week 3');

  // Compute local result immediately (synced multipliers → same as API)
  const localResult = simulate(intensity, channel, brand, week, currentMonthTarget, DEMO_BASELINE_FORECAST_GBP);
  const [result, setResult] = useState<SimulatorResult>(localResult);
  const [apiSource, setApiSource] = useState<'api' | 'local'>('local');
  const [apiExplanation, setApiExplanation] = useState<string | null>(null);

  // Debounce API call by 400 ms to avoid flooding on rapid clicks
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Always show local result immediately
    const local = simulate(intensity, channel, brand, week, currentMonthTarget, DEMO_BASELINE_FORECAST_GBP);
    setResult(local);
    setApiExplanation(null);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const api = await runSimulate({ intensity, channel, brand, week });
      if (api) {
        setResult({
          newForecast: api.newForecast,
          remainingGap: api.remainingGap,
          hitProbability: api.hitProbability,
          incrementalImpact: api.incrementalImpact,
        });
        setApiExplanation(api.explanation);
        setApiSource('api');
      } else {
        setApiSource('local');
      }
    }, 400);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [intensity, channel, brand, week, currentMonthTarget]);

  const localExplanation = getScenarioExplanation(channel, week, brand, result);
  const explanation = apiExplanation ?? localExplanation;

  const gapTone: Tone = result.remainingGap >= 0 ? 'success' : result.remainingGap > -40000 ? 'warning' : 'danger';
  const probTone: Tone = result.hitProbability >= 70 ? 'success' : result.hitProbability >= 50 ? 'warning' : 'danger';
  const delta = result.newForecast - DEMO_BASELINE_FORECAST_GBP;
  const probDelta = result.hitProbability - BASE_PROBABILITY;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="What happens if we change the plan?"
        description="Simulate the commercial impact of promotion intensity, channel focus, brand focus and activation week."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs panel */}
        <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-6 space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical size={16} className="text-ink-500" />
            <p className="text-[13px] font-semibold text-ink-900">Scenario inputs</p>
            <div className="ml-auto flex items-center gap-1">
              {apiSource === 'api' ? (
                <><Wifi size={11} className="text-success" /><span className="text-[9px] text-success font-semibold">API</span></>
              ) : (
                <><WifiOff size={11} className="text-ink-400" /><span className="text-[9px] text-ink-400 font-semibold">Local</span></>
              )}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-2">Promotion intensity</p>
            <div className="flex gap-2 flex-wrap">
              {simulatorOptions.intensities.map((opt) => (
                <OptionButton key={opt} value={opt} selected={intensity} onClick={setIntensity}>{opt}</OptionButton>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-2">Channel focus</p>
            <div className="flex gap-2 flex-wrap">
              {simulatorOptions.channels.map((opt) => (
                <OptionButton key={opt} value={opt} selected={channel} onClick={setChannel}>{opt}</OptionButton>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-2">Brand focus</p>
            <div className="flex gap-2 flex-wrap">
              {simulatorOptions.brands.map((opt) => (
                <OptionButton key={opt} value={opt} selected={brand} onClick={setBrand}>{opt}</OptionButton>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-2">Activation week</p>
            <div className="flex gap-2 flex-wrap">
              {simulatorOptions.weeks.map((opt) => (
                <OptionButton key={opt} value={opt} selected={week} onClick={setWeek}>{opt}</OptionButton>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-ink-100">
            <div className="flex items-center gap-2 text-[12px] text-ink-500 flex-wrap">
              <span className="bg-ink-100 px-2 py-0.5 rounded font-medium text-ink-700">{intensity}</span>
              <ArrowRight size={12} />
              <span className="bg-ink-100 px-2 py-0.5 rounded font-medium text-ink-700">{channel}</span>
              <ArrowRight size={12} />
              <span className="bg-ink-100 px-2 py-0.5 rounded font-medium text-ink-700">{brand}</span>
              <ArrowRight size={12} />
              <span className="bg-ink-100 px-2 py-0.5 rounded font-medium text-ink-700">{week}</span>
            </div>
          </div>
        </div>

        {/* Results panel */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-5">
            <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Simulated forecast</p>
            <div className="flex items-end gap-3">
              <p className="text-[36px] font-bold text-ink-900 leading-none">
                {formatCurrency(result.newForecast, true)}
              </p>
              <p className="text-[14px] text-success font-semibold mb-1">
                +{formatCurrency(delta, true)}
              </p>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-500">vs target of {formatCurrency(currentMonthTarget, true)}</span>
                <span className="font-semibold text-ink-700">
                  {((result.newForecast / currentMonthTarget) * 100).toFixed(0)}%
                </span>
              </div>
              <ProgressBar
                value={result.newForecast}
                max={currentMonthTarget}
                tone={result.newForecast >= currentMonthTarget ? 'success' : 'warning'}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Remaining gap</p>
                <p className={`text-[22px] font-bold ${result.remainingGap >= 0 ? 'text-success' : 'text-warning'}`}>
                  {result.remainingGap >= 0
                    ? `+${formatCurrency(result.remainingGap, true)}`
                    : formatCurrency(result.remainingGap, true)}
                </p>
              </div>
              <StatusBadge
                status={result.remainingGap >= 0 ? 'On Track' : 'At Risk'}
                tone={gapTone}
                size="md"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Hit probability</p>
                <p className={`text-[28px] font-bold leading-none ${probTone === 'success' ? 'text-success' : probTone === 'warning' ? 'text-warning' : 'text-danger'}`}>
                  {result.hitProbability}%
                </p>
                <p className="text-[11px] text-ink-400 mt-0.5">
                  {probDelta >= 0 ? '+' : ''}{probDelta.toFixed(0)}pp vs baseline ({BASE_PROBABILITY}%)
                </p>
              </div>
              <div className="w-24">
                <ProgressBar value={result.hitProbability} max={100} tone={probTone} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-4">
            <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Expected incremental impact</p>
            <p className="text-[22px] font-bold text-success">+{formatCurrency(result.incrementalImpact, true)}</p>
            <p className="text-[11px] text-ink-400 mt-0.5">
              vs baseline forecast of {formatCurrency(DEMO_BASELINE_FORECAST_GBP, true)}
            </p>
          </div>
        </div>
      </div>

      <InsightCard title="Scenario explanation" tone={result.remainingGap >= 0 ? 'success' : 'warning'}>
        {explanation}
      </InsightCard>

      {/* Comparison table */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-5">
        <p className="text-[13px] font-semibold text-ink-900 mb-4">Scenario comparison</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="text-left pb-2 text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Scenario</th>
                <th className="text-right pb-2 text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Forecast</th>
                <th className="text-right pb-2 text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Gap</th>
                <th className="text-right pb-2 text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Probability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              <tr>
                <td className="py-2.5 text-ink-500">Baseline (no action)</td>
                <td className="py-2.5 text-right font-medium text-ink-900">{formatCurrency(DEMO_BASELINE_FORECAST_GBP, true)}</td>
                <td className="py-2.5 text-right font-semibold text-danger">-£120k</td>
                <td className="py-2.5 text-right font-medium text-ink-700">{BASE_PROBABILITY}%</td>
              </tr>
              <tr>
                <td className="py-2.5 text-ink-700 font-medium">Balanced Recovery (recommended)</td>
                <td className="py-2.5 text-right font-medium text-ink-900">£1.22M</td>
                <td className="py-2.5 text-right font-semibold text-success">+£16k</td>
                <td className="py-2.5 text-right font-medium text-success">74%</td>
              </tr>
              <tr className="bg-ink-50/50">
                <td className="py-2.5 text-ink-900 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical size={12} className="text-ink-500" />
                    This scenario
                  </span>
                </td>
                <td className="py-2.5 text-right font-bold text-ink-900">{formatCurrency(result.newForecast, true)}</td>
                <td className={`py-2.5 text-right font-bold ${result.remainingGap >= 0 ? 'text-success' : 'text-warning'}`}>
                  {result.remainingGap >= 0 ? '+' : ''}{formatCurrency(result.remainingGap, true)}
                </td>
                <td className={`py-2.5 text-right font-bold ${result.hitProbability >= 70 ? 'text-success' : 'text-warning'}`}>
                  {result.hitProbability}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
