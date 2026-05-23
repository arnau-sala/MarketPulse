import type {
  ActionPlan,
  BrandPerformance,
  ChannelPerformance,
  DemandWindow,
  ForecastPoint,
  GapDriver,
  MonthlyMetrics,
  SimulatorOptions,
  SalesMomentumPoint,
  SalesMomentumPeriod,
} from '../types';

export const monthlyMetrics: MonthlyMetrics = {
  market: 'UK',
  month: 'March 2025',
  salesToDate: 742000,
  monthlyTarget: 1200000,
  baselineForecast: 1080000,
  expectedGap: -120000,
  hitProbability: 34,
  status: 'At Risk',
  lastUpdated: '23 May 2026 · 09:30',
};

// Weekly incremental sales — each value is one week's revenue in £.
// Historical (actual !== null): Jan 06 – May 18 2026 · 20 weeks
// Future  (actual === null):    May 25 – Aug 17 2026 · 13 weeks
// Weekly target ≈ £277k (£1.2M monthly ÷ 4.33)
export const forecastSeries: ForecastPoint[] = [
  { day: 'Jan 06', actual: 298000, target: 277000, forecast: 298000, actionForecast: null },
  { day: 'Jan 13', actual: 312000, target: 277000, forecast: 312000, actionForecast: null },
  { day: 'Jan 20', actual: 289000, target: 277000, forecast: 289000, actionForecast: null },
  { day: 'Jan 27', actual: 276000, target: 277000, forecast: 276000, actionForecast: null },
  { day: 'Feb 03', actual: 304000, target: 277000, forecast: 304000, actionForecast: null },
  { day: 'Feb 10', actual: 291000, target: 277000, forecast: 291000, actionForecast: null },
  { day: 'Feb 17', actual: 283000, target: 277000, forecast: 283000, actionForecast: null },
  { day: 'Feb 24', actual: 295000, target: 277000, forecast: 295000, actionForecast: null },
  { day: 'Mar 03', actual: 271000, target: 277000, forecast: 271000, actionForecast: null },
  { day: 'Mar 10', actual: 308000, target: 277000, forecast: 308000, actionForecast: null },
  { day: 'Mar 17', actual: 318000, target: 277000, forecast: 318000, actionForecast: null },
  { day: 'Mar 24', actual: 287000, target: 277000, forecast: 287000, actionForecast: null },
  { day: 'Mar 31', actual: 269000, target: 277000, forecast: 269000, actionForecast: null },
  { day: 'Apr 07', actual: 261000, target: 277000, forecast: 261000, actionForecast: null },
  { day: 'Apr 14', actual: 254000, target: 277000, forecast: 254000, actionForecast: null },
  { day: 'Apr 21', actual: 258000, target: 277000, forecast: 258000, actionForecast: null },
  { day: 'Apr 28', actual: 266000, target: 277000, forecast: 266000, actionForecast: null },
  { day: 'May 05', actual: 252000, target: 277000, forecast: 252000, actionForecast: null },
  { day: 'May 12', actual: 261000, target: 277000, forecast: 261000, actionForecast: null },
  { day: 'May 19', actual: 255000, target: 277000, forecast: 255000, actionForecast: null },
  // Future forecast
  { day: 'May 26', actual: null, target: 277000, forecast: 258000, actionForecast: null },
  { day: 'Jun 02', actual: null, target: 277000, forecast: 262000, actionForecast: null },
  { day: 'Jun 09', actual: null, target: 277000, forecast: 271000, actionForecast: null },
  { day: 'Jun 16', actual: null, target: 277000, forecast: 268000, actionForecast: null },
  { day: 'Jun 23', actual: null, target: 277000, forecast: 274000, actionForecast: null },
  { day: 'Jun 30', actual: null, target: 277000, forecast: 279000, actionForecast: null },
  { day: 'Jul 07', actual: null, target: 277000, forecast: 283000, actionForecast: null },
  { day: 'Jul 14', actual: null, target: 277000, forecast: 276000, actionForecast: null },
  { day: 'Jul 21', actual: null, target: 277000, forecast: 281000, actionForecast: null },
  { day: 'Jul 28', actual: null, target: 277000, forecast: 285000, actionForecast: null },
  { day: 'Aug 04', actual: null, target: 277000, forecast: 278000, actionForecast: null },
  { day: 'Aug 11', actual: null, target: 277000, forecast: 272000, actionForecast: null },
  { day: 'Aug 18', actual: null, target: 277000, forecast: 268000, actionForecast: null },
];

export const salesMomentumData: Record<string, SalesMomentumPeriod> = {
  '7d': {
    target: 280000,
    points: [
      { period: 'Mon', actualSales: 210000, noActionForecast: null, recommendedForecast: null, target: 280000 },
      { period: 'Tue', actualSales: 236000, noActionForecast: null, recommendedForecast: null, target: 280000 },
      { period: 'Wed', actualSales: 251000, noActionForecast: null, recommendedForecast: null, target: 280000 },
      { period: 'Today', actualSales: 268000, noActionForecast: 268000, recommendedForecast: 268000, target: 280000, today: true },
      { period: 'Fri', actualSales: null, noActionForecast: 272000, recommendedForecast: 287000, target: 280000 },
      { period: 'Sat', actualSales: null, noActionForecast: 276000, recommendedForecast: 296000, target: 280000 },
      { period: 'Sun', actualSales: null, noActionForecast: 279000, recommendedForecast: 304000, target: 280000 },
    ],
  },
  mtd: {
    target: 768000,
    points: [
      { period: 'Mar 01', actualSales: 42000, noActionForecast: null, recommendedForecast: null, target: 768000 },
      { period: 'Mar 05', actualSales: 154000, noActionForecast: null, recommendedForecast: null, target: 768000 },
      { period: 'Mar 09', actualSales: 267000, noActionForecast: null, recommendedForecast: null, target: 768000 },
      { period: 'Mar 13', actualSales: 376000, noActionForecast: null, recommendedForecast: null, target: 768000 },
      { period: 'Mar 17', actualSales: 503000, noActionForecast: null, recommendedForecast: null, target: 768000 },
      { period: 'Mar 21', actualSales: 621000, noActionForecast: null, recommendedForecast: null, target: 768000 },
      { period: 'Today', actualSales: 742000, noActionForecast: 742000, recommendedForecast: 742000, target: 768000, today: true },
      { period: 'Mar 31', actualSales: null, noActionForecast: 1080000, recommendedForecast: 1216000, target: 768000 },
    ],
  },
  fullMonth: {
    target: 1200000,
    points: [
      { period: 'Mar 01', actualSales: 42000, noActionForecast: null, recommendedForecast: null, target: 1200000 },
      { period: 'Mar 08', actualSales: 205000, noActionForecast: null, recommendedForecast: null, target: 1200000 },
      { period: 'Mar 15', actualSales: 439000, noActionForecast: null, recommendedForecast: null, target: 1200000 },
      { period: 'Today', actualSales: 742000, noActionForecast: 742000, recommendedForecast: 742000, target: 1200000, today: true },
      { period: 'Mar 24', actualSales: null, noActionForecast: 860000, recommendedForecast: 935000, target: 1200000 },
      { period: 'Mar 27', actualSales: null, noActionForecast: 980000, recommendedForecast: 1090000, target: 1200000 },
      { period: 'Mar 29', actualSales: null, noActionForecast: 1080000, recommendedForecast: 1216000, target: 1200000 },
    ],
  },
  quarter: {
    target: 3600000,
    points: [
      { period: 'Jan', actualSales: 690000, noActionForecast: null, recommendedForecast: null, target: 3600000 },
      { period: 'Feb', actualSales: 1430000, noActionForecast: null, recommendedForecast: null, target: 3600000 },
      { period: 'Mar W1', actualSales: 2060000, noActionForecast: null, recommendedForecast: null, target: 3600000 },
      { period: 'Today', actualSales: 2384000, noActionForecast: 2384000, recommendedForecast: 2384000, target: 3600000, today: true },
      { period: 'Apr', actualSales: null, noActionForecast: 2740000, recommendedForecast: 2850000, target: 3600000 },
      { period: 'May', actualSales: null, noActionForecast: 3090000, recommendedForecast: 3290000, target: 3600000 },
      { period: 'Jun', actualSales: null, noActionForecast: 3240000, recommendedForecast: 3680000, target: 3600000 },
    ],
  },
};

export const gapDrivers: GapDriver[] = [
  {
    name: 'Off-Trade underperformance',
    impact: -51600,
    share: 43,
    explanation:
      'Retail sell-out is lagging pace in the largest channel, mainly because core visibility and promotional support are softer than planned.',
    dimension: 'Channel',
  },
  {
    name: 'Voll-Damm premium slowdown',
    impact: -31200,
    share: 26,
    explanation:
      'Premium momentum is softer than target, reducing mix uplift and leaving a larger hole in the month-end forecast.',
    dimension: 'Brand',
  },
  {
    name: 'Promo mechanics weaker than expected',
    impact: -24000,
    share: 20,
    explanation:
      'Current trade mechanics are delivering less incremental volume per activation than the recovery case assumed.',
    dimension: 'Promotion',
  },
  {
    name: 'Late-month conversion risk',
    impact: -13200,
    share: 11,
    explanation:
      'A softer pipeline in the final trading days could limit the amount of gap that can still be recovered.',
    dimension: 'Timing',
  },
];

export const demandWindows: DemandWindow[] = [
  {
    week: 'Week 2',
    baselineDemand: 'Medium',
    promoSensitivity: 'Medium',
    opportunityScore: 58,
    recommendation: 'Monitor',
    explanation:
      'Useful for light activation, but the demand base is not yet strong enough to justify the highest investment level.',
  },
  {
    week: 'Week 3',
    baselineDemand: 'High',
    promoSensitivity: 'High',
    opportunityScore: 87,
    recommendation: 'Activate',
    explanation:
      'This is the strongest recovery window: demand is high, promo response is strong and there is still enough time to influence the close.',
  },
  {
    week: 'Week 4',
    baselineDemand: 'Medium',
    promoSensitivity: 'High',
    opportunityScore: 76,
    recommendation: 'Tactical Push',
    explanation:
      'A secondary chance to reinforce Week 3 activity and capture end-of-month urgency if execution capacity remains.',
  },
];

export const actionPlans: ActionPlan[] = [
  {
    id: 'balanced',
    name: 'Balanced Recovery',
    label: 'Recommended',
    recommended: true,
    goal: 'Close the gap while balancing impact and risk',
    expectedImpact: 136000,
    forecastAfterAction: 1216000,
    remainingGap: 16000,
    hitProbability: 74,
    risk: 'Medium',
    explanation:
      'The recommended plan tackles the biggest gap driver, times the activation to the strongest demand window and uses one extra push to lift close probability.',
    actions: [
      {
        title: 'Reallocate trade support to Off-Trade',
        week: 'Week 3',
        impact: 52000,
        confidence: 86,
        why: 'Concentrates spend where the gap is largest and where volume response is strongest.',
      },
      {
        title: 'Advance the planned premium activation',
        week: 'Week 3',
        impact: 41000,
        confidence: 78,
        why: 'Pulls demand forward while premium shoppers are most responsive.',
      },
      {
        title: 'Add a final-week tactical push',
        week: 'Week 4',
        impact: 43000,
        confidence: 69,
        why: 'Provides a late-month top-up to protect the close if the first two actions land well.',
      },
    ],
  },
  {
    id: 'conservative',
    name: 'Conservative Focus',
    label: 'Low risk',
    recommended: false,
    goal: 'Reduce the gap with a single high-confidence lever',
    expectedImpact: 69000,
    forecastAfterAction: 1149000,
    remainingGap: -51000,
    hitProbability: 56,
    risk: 'Low',
    explanation:
      'This plan keeps the execution simple and focuses on the most predictable lever, making it suitable when the team has limited capacity.',
    actions: [
      {
        title: 'Boost Estrella Damm in Off-Trade',
        week: 'Week 3',
        impact: 69000,
        confidence: 84,
        why: 'A single-channel, single-brand push with the best balance of certainty and speed.',
      },
    ],
  },
  {
    id: 'aggressive',
    name: 'Aggressive Growth',
    label: 'High upside',
    recommended: false,
    goal: 'Over-deliver against target with a broader activation',
    expectedImpact: 168000,
    forecastAfterAction: 1248000,
    remainingGap: 48000,
    hitProbability: 81,
    risk: 'High',
    explanation:
      'Adds an online burst on top of the core recovery actions, increasing upside but also requiring more coordination.',
    actions: [
      {
        title: 'Run the core Off-Trade recovery push',
        week: 'Week 3',
        impact: 64000,
        confidence: 82,
        why: 'Still anchors the plan in the largest channel opportunity.',
      },
      {
        title: 'Accelerate premium visibility',
        week: 'Week 3',
        impact: 48000,
        confidence: 74,
        why: 'Improves mix and adds incremental volume in the premium segment.',
      },
      {
        title: 'Launch a digital flash activation',
        week: 'Week 4',
        impact: 56000,
        confidence: 63,
        why: 'Captures late demand but depends on tight cross-functional execution.',
      },
    ],
  },
];

export const channelPerformance: ChannelPerformance[] = [
  { channel: 'Off-Trade', actual: 460000, target: 520000, gap: -60000 },
  { channel: 'On-Trade', actual: 186000, target: 210000, gap: -24000 },
  { channel: 'Online', actual: 96000, target: 110000, gap: -14000 },
];

export const brandPerformance: BrandPerformance[] = [
  { brand: 'Estrella Damm', actual: 332000, target: 350000, gap: -18000, share: 45 },
  { brand: 'Voll-Damm', actual: 178000, target: 214000, gap: -36000, share: 24 },
  { brand: 'Estrella Daura', actual: 94000, target: 108000, gap: -14000, share: 13 },
  { brand: 'Others', actual: 138000, target: 146000, gap: -8000, share: 18 },
];

export const simulatorOptions: SimulatorOptions = {
  intensities: ['Low', 'Medium', 'High'],
  channels: ['Off-Trade', 'On-Trade', 'Online'],
  brands: ['Estrella Damm', 'Voll-Damm', 'Estrella Daura'],
  weeks: ['Week 2', 'Week 3', 'Week 4'],
};