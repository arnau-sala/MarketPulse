import type { PromoIntensity, Channel, Brand, Week, SimulatorResult } from '../types';
import { monthlyMetrics } from '../data/mockData';
import { clamp } from './formatters';

const baseImpactByIntensity: Record<PromoIntensity, number> = {
  Low:    42000,
  Medium: 82000,
  High:   128000,
};

const channelMultiplier: Record<Channel, number> = {
  'Off-Trade': 1.20,
  'On-Trade':  0.85,
  'Online':    0.75,
};

const brandMultiplier: Record<Brand, number> = {
  'Estrella Damm':  1.15,
  'Voll-Damm':      0.90,
  'Estrella Daura': 0.80,
};

const weekMultiplier: Record<Week, number> = {
  'Week 2': 0.75,
  'Week 3': 1.25,
  'Week 4': 0.95,
};

export function simulate(
  intensity: PromoIntensity,
  channel: Channel,
  brand: Brand,
  week: Week,
): SimulatorResult {
  const base = baseImpactByIntensity[intensity];
  const incrementalImpact = Math.round(
    base * channelMultiplier[channel] * brandMultiplier[brand] * weekMultiplier[week]
  );

  const newForecast = monthlyMetrics.baselineForecast + incrementalImpact;
  const remainingGap = newForecast - monthlyMetrics.monthlyTarget;
  const hitProbability = clamp(
    monthlyMetrics.hitProbability + incrementalImpact / 4000,
    monthlyMetrics.hitProbability,
    92,
  );

  return {
    newForecast,
    remainingGap,
    hitProbability: Math.round(hitProbability),
    incrementalImpact,
  };
}

export function getScenarioExplanation(
  channel: Channel,
  week: Week,
  brand: Brand,
  result: SimulatorResult,
): string {
  const weekScores: Record<Week, number> = { 'Week 2': 58, 'Week 3': 87, 'Week 4': 76 };
  const score = weekScores[week];
  const direction = result.remainingGap >= 0 ? 'above target' : `£${Math.abs(result.remainingGap / 1000).toFixed(0)}k below target`;
  return `This scenario targets ${channel} with ${brand} during ${week} (opportunity score: ${score}/100). The incremental impact brings the monthly forecast to £${(result.newForecast / 1000).toFixed(0)}k — ${direction}.`;
}
