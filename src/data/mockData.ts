import type {
  MonthlyMetrics,
  ForecastPoint,
  GapDriver,
  DemandWindow,
  ActionPlan,
  ChannelPerformance,
  BrandPerformance,
  SimulatorOptions,
} from '../types';

// ─── Monthly Metrics ──────────────────────────────────────────────────────────

export const monthlyMetrics: MonthlyMetrics = {
  market: 'UK',
  month: 'May 2026',
  salesToDate: 742000,
  monthlyTarget: 1200000,
  baselineForecast: 1080000,
  expectedGap: -120000,
  hitProbability: 34,
  status: 'At Risk',
  lastUpdated: '24 May 2026 · 09:30',
};

// ─── Forecast Series ──────────────────────────────────────────────────────────
// Weekly incremental values in £. The chart accumulates these cumulatively.
// 20 historical weeks (Jan–May 2026) + 13 future weeks (May–Aug 2026).
// Weekly target ≈ £277k (£1.2M monthly ÷ 4.33)

export const forecastSeries: ForecastPoint[] = [
  { day: 'Jan 06', actual: 298000,  target: 277000, forecast: 298000,  actionForecast: null },
  { day: 'Jan 13', actual: 312000,  target: 277000, forecast: 312000,  actionForecast: null },
  { day: 'Jan 20', actual: 289000,  target: 277000, forecast: 289000,  actionForecast: null },
  { day: 'Jan 27', actual: 276000,  target: 277000, forecast: 276000,  actionForecast: null },
  { day: 'Feb 03', actual: 304000,  target: 277000, forecast: 304000,  actionForecast: null },
  { day: 'Feb 10', actual: 291000,  target: 277000, forecast: 291000,  actionForecast: null },
  { day: 'Feb 17', actual: 283000,  target: 277000, forecast: 283000,  actionForecast: null },
  { day: 'Feb 24', actual: 295000,  target: 277000, forecast: 295000,  actionForecast: null },
  { day: 'Mar 03', actual: 271000,  target: 277000, forecast: 271000,  actionForecast: null },
  { day: 'Mar 10', actual: 308000,  target: 277000, forecast: 308000,  actionForecast: null },
  { day: 'Mar 17', actual: 318000,  target: 277000, forecast: 318000,  actionForecast: null },
  { day: 'Mar 24', actual: 287000,  target: 277000, forecast: 287000,  actionForecast: null },
  { day: 'Mar 31', actual: 269000,  target: 277000, forecast: 269000,  actionForecast: null },
  { day: 'Apr 07', actual: 261000,  target: 277000, forecast: 261000,  actionForecast: null },
  { day: 'Apr 14', actual: 254000,  target: 277000, forecast: 254000,  actionForecast: null },
  { day: 'Apr 21', actual: 258000,  target: 277000, forecast: 258000,  actionForecast: null },
  { day: 'Apr 28', actual: 266000,  target: 277000, forecast: 266000,  actionForecast: null },
  { day: 'May 05', actual: 252000,  target: 277000, forecast: 252000,  actionForecast: null },
  { day: 'May 12', actual: 261000,  target: 277000, forecast: 261000,  actionForecast: null },
  { day: 'May 19', actual: 255000,  target: 277000, forecast: 255000,  actionForecast: null },
  { day: 'May 26', actual: null,    target: 277000, forecast: 258000,  actionForecast: 297000 },
  { day: 'Jun 02', actual: null,    target: 277000, forecast: 262000,  actionForecast: 302000 },
  { day: 'Jun 09', actual: null,    target: 277000, forecast: 271000,  actionForecast: 347000 },
  { day: 'Jun 16', actual: null,    target: 277000, forecast: 268000,  actionForecast: 343000 },
  { day: 'Jun 23', actual: null,    target: 277000, forecast: 274000,  actionForecast: 315000 },
  { day: 'Jun 30', actual: null,    target: 277000, forecast: 279000,  actionForecast: 321000 },
  { day: 'Jul 07', actual: null,    target: 277000, forecast: 283000,  actionForecast: 325000 },
  { day: 'Jul 14', actual: null,    target: 277000, forecast: 276000,  actionForecast: 318000 },
  { day: 'Jul 21', actual: null,    target: 277000, forecast: 281000,  actionForecast: 323000 },
  { day: 'Jul 28', actual: null,    target: 277000, forecast: 285000,  actionForecast: 328000 },
  { day: 'Aug 04', actual: null,    target: 277000, forecast: 278000,  actionForecast: 320000 },
  { day: 'Aug 11', actual: null,    target: 277000, forecast: 272000,  actionForecast: 313000 },
  { day: 'Aug 18', actual: null,    target: 277000, forecast: 268000,  actionForecast: 308000 },
];

// ─── Gap Drivers ──────────────────────────────────────────────────────────────

export const gapDrivers: GapDriver[] = [
  {
    name: 'Off-Trade underperformance',
    impact: -51600,
    share: 0.43,
    explanation: 'Supermarket & convenience channel running 18% below May target. Key accounts Tesco and Sainsbury\'s showing weaker-than-expected depletions.',
    dimension: 'Channel',
  },
  {
    name: 'Voll-Damm premium slowdown',
    impact: -31200,
    share: 0.26,
    explanation: 'Premium segment facing headwinds as consumers trade down. Voll-Damm volume -22% vs forecast, partially offset by Estrella Daura gains.',
    dimension: 'Brand',
  },
  {
    name: 'Weak promo mechanics',
    impact: -24000,
    share: 0.20,
    explanation: 'Current promotional execution delivering only 68% of expected uplift. Price-point sensitivity higher than modelled in Q1 2026.',
    dimension: 'Promo',
  },
  {
    name: 'Timing / demand shift',
    impact: -13200,
    share: 0.11,
    explanation: 'Bank holiday pattern in May shifted demand earlier than forecast. Weeks 1–2 outperformed but cumulative impact is negative.',
    dimension: 'Timing',
  },
];

// ─── Demand Windows ───────────────────────────────────────────────────────────

export const demandWindows: DemandWindow[] = [
  {
    week: 'Week 1 (May 26–Jun 1)',
    baselineDemand: 'Low',
    promoSensitivity: 'Low',
    opportunityScore: 42,
    recommendation: 'Maintain',
    explanation: 'Post-bank-holiday dip. Low consumer footfall and spend. Hold current activity.',
  },
  {
    week: 'Week 2 (Jun 2–8)',
    baselineDemand: 'Medium',
    promoSensitivity: 'Medium',
    opportunityScore: 58,
    recommendation: 'Monitor',
    explanation: 'Moderate demand environment. Some promotional sensitivity. Stage activations in premium off-trade.',
  },
  {
    week: 'Week 3 (Jun 9–15)',
    baselineDemand: 'High',
    promoSensitivity: 'High',
    opportunityScore: 87,
    recommendation: 'Activate',
    explanation: 'Payday week + summer onset. Highest Off-Trade footfall of the period. Price promotions deliver 1.3× normal uplift. Best window to recover the gap.',
  },
  {
    week: 'Week 4 (Jun 16–22)',
    baselineDemand: 'Medium',
    promoSensitivity: 'Medium',
    opportunityScore: 76,
    recommendation: 'Tactical Push',
    explanation: 'Strong carry-through from Week 3. Good On-Trade opportunity as outdoor dining peaks. Target premium occasions.',
  },
];

// ─── Action Plans ─────────────────────────────────────────────────────────────

export const actionPlans: ActionPlan[] = [
  {
    id: 'conservative',
    name: 'Recuperación Conservadora',
    label: 'Conservative',
    recommended: false,
    goal: 'Reduce gap by ~50% with a single high-confidence lever',
    expectedImpact: 68000,
    forecastAfterAction: 1148000,
    remainingGap: -52000,
    hitProbability: 52,
    risk: 'Low',
    explanation: 'Activate Estrella Damm Off-Trade price promotion in Week 3 only. Single lever, easy execution, low coordination overhead.',
    actions: [
      {
        title: 'Estrella Damm Off-Trade price activation (Week 3)',
        week: 'Week 3',
        impact: 68000,
        confidence: 82,
        why: 'Proven mechanic with 82% confidence based on 18 comparable promo weeks. Week 3 payday peak delivers 1.32× average uplift.',
      },
    ],
  },
  {
    id: 'balanced',
    name: 'Recuperación Equilibrada',
    label: 'Balanced',
    recommended: true,
    goal: 'Close the gap entirely with a multi-lever approach',
    expectedImpact: 136000,
    forecastAfterAction: 1216000,
    remainingGap: 16000,
    hitProbability: 74,
    risk: 'Medium',
    explanation: 'Combines Off-Trade price promo (Week 3) with On-Trade premium occasion activation (Week 4). Two levers, cross-team coordination required but manageable.',
    actions: [
      {
        title: 'Estrella Damm Off-Trade price promotion',
        week: 'Week 3',
        impact: 82000,
        confidence: 78,
        why: 'Off-Trade is the largest gap driver (43% of shortfall). Week 3 payday timing amplifies promotional uplift by 1.32×.',
      },
      {
        title: 'Premium On-Trade occasion push (Voll-Damm)',
        week: 'Week 4',
        impact: 36000,
        confidence: 65,
        why: 'Addresses the Voll-Damm premium slowdown. Summer outdoor occasions in Week 4 provide a natural demand trigger.',
      },
      {
        title: 'Digital retargeting — Estrella Daura health segment',
        week: 'Week 3',
        impact: 18000,
        confidence: 71,
        why: 'Low-cost digital activation targeting health-conscious consumers. Estrella Daura is growing vs forecast; amplifying this offsets Voll-Damm drag.',
      },
    ],
  },
  {
    id: 'aggressive',
    name: 'Recuperación Agresiva',
    label: 'Aggressive',
    recommended: false,
    goal: 'Maximise revenue; overshoot target if possible',
    expectedImpact: 195000,
    forecastAfterAction: 1275000,
    remainingGap: 75000,
    hitProbability: 61,
    risk: 'High',
    explanation: 'Full portfolio activation across all channels and weeks. High coordination complexity; budget overspend risk if uplift disappoints.',
    actions: [
      {
        title: 'Estrella Damm national Off-Trade promotion',
        week: 'Week 3',
        impact: 95000,
        confidence: 72,
        why: 'National scale amplifies uplift but reduces execution confidence. Logistics and POS lead-time are the key risk.',
      },
      {
        title: 'Voll-Damm premium dining partnership blitz',
        week: 'Week 3',
        impact: 52000,
        confidence: 58,
        why: 'Targets premium On-Trade with bespoke dining activations. High-effort, high-reward mechanic.',
      },
      {
        title: 'Estrella Daura online flash campaign',
        week: 'Week 2',
        impact: 28000,
        confidence: 63,
        why: 'Early-week digital push to warm demand ahead of the Week 3 peak. Paid social targeting 25–40 health segment.',
      },
      {
        title: 'Portfolio cross-sell at checkout (all channels)',
        week: 'Week 4',
        impact: 20000,
        confidence: 55,
        why: 'Carry-through mechanic. Captures residual demand from Weeks 2–3 activations.',
      },
    ],
  },
];

// ─── Channel Performance ──────────────────────────────────────────────────────

export const channelPerformance: ChannelPerformance[] = [
  { channel: 'Off-Trade', actual: 318000, target: 516000, gap: -198000 },
  { channel: 'On-Trade',  actual: 284000, target: 516000, gap: -232000 },
  { channel: 'Online',    actual: 140000, target: 168000, gap: -28000  },
];

// ─── Brand Performance ────────────────────────────────────────────────────────

export const brandPerformance: BrandPerformance[] = [
  { brand: 'Estrella Damm',  actual: 612000, target: 648000, gap: -36000,  share: 0.82 },
  { brand: 'Voll-Damm',      actual: 83000,  target: 108000, gap: -25000,  share: 0.11 },
  { brand: 'Estrella Daura', actual: 47000,  target: 44000,  gap:  3000,   share: 0.06 },
];

// ─── Simulator Options ────────────────────────────────────────────────────────

export const simulatorOptions: SimulatorOptions = {
  intensities: ['Low', 'Medium', 'High'],
  channels:    ['Off-Trade', 'On-Trade', 'Online'],
  brands:      ['Estrella Damm', 'Voll-Damm', 'Estrella Daura'],
  weeks:       ['Week 2', 'Week 3', 'Week 4'],
};
