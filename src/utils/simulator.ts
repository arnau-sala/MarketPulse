/**
 * Local what-if simulation — multipliers synced with backend calibrated_multipliers.json.
 * Values match data/processed/calibrated_multipliers.json exactly so the frontend
 * gives the same result as POST /api/simulate when the API is unavailable.
 */
import type { PromoIntensity, Channel, Brand, Week, SimulatorResult } from '../types';
import { clamp } from './formatters';

// Matches backend _BASE_IMPACT (from calibrated_multipliers.json base_impact_gbp)
const baseImpactByIntensity: Record<PromoIntensity, number> = {
  Low:    17000,
  Medium: 66000,
  High:   159000,
};

// Matches backend _CHANNEL_MULT (calibrated from forecast_weekly.csv + price-elasticity proxy)
const channelMultiplier: Record<Channel, number> = {
  'Off-Trade': 1.084,
  'On-Trade':  0.936,
  'Online':    0.75,
};

// Matches backend _BRAND_MULT (volume-share derived; Voll-Damm/Daura are directional assumptions)
const brandMultiplier: Record<Brand, number> = {
  'Estrella Damm':  1.0,
  'Voll-Damm':      0.9,
  'Estrella Daura': 0.8,
};

// Matches backend _WEEK_MULT (UK payday demand pattern, validated on 175-week series)
const weekMultiplier: Record<Week, number> = {
  'Week 2': 0.895,
  'Week 3': 1.316,
  'Week 4': 1.0,
};

const BASE_PROBABILITY = 34;

export function simulate(
  intensity: PromoIntensity,
  channel: Channel,
  brand: Brand,
  week: Week,
  monthlyTarget: number,
  baselineForecast: number,
): SimulatorResult {
  const incrementalImpact = Math.round(
    baseImpactByIntensity[intensity] *
    channelMultiplier[channel] *
    brandMultiplier[brand] *
    weekMultiplier[week],
  );

  const newForecast = baselineForecast + incrementalImpact;
  const remainingGap = newForecast - monthlyTarget;
  const hitProbability = Math.round(
    clamp(BASE_PROBABILITY + incrementalImpact / 4000, BASE_PROBABILITY, 92),
  );

  return { newForecast, remainingGap, hitProbability, incrementalImpact };
}

export function getScenarioExplanation(
  channel: Channel,
  week: Week,
  brand: Brand,
  result: SimulatorResult,
): string {
  const weekScores: Record<Week, number> = { 'Week 2': 58, 'Week 3': 87, 'Week 4': 76 };
  const score = weekScores[week];
  const direction =
    result.remainingGap >= 0
      ? 'above target'
      : `£${Math.abs(result.remainingGap / 1000).toFixed(0)}k below target`;
  return (
    `This scenario targets ${channel} with ${brand} during ${week} ` +
    `(opportunity score: ${score}/100). ` +
    `The incremental impact brings the monthly forecast to £${(result.newForecast / 1000).toFixed(0)}k — ${direction}.`
  );
}
