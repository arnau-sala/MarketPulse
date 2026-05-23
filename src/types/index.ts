export type Tone = 'neutral' | 'success' | 'warning' | 'danger';
export type Risk = 'Low' | 'Medium' | 'High';
export type Status = 'On Track' | 'At Risk' | 'Critical' | 'Ahead';
export type Recommendation = 'Maintain' | 'Monitor' | 'Activate' | 'Tactical Push';
export type DemandLevel = 'Low' | 'Medium' | 'High';
export type PromoIntensity = 'Low' | 'Medium' | 'High';
export type Channel = 'Off-Trade' | 'On-Trade' | 'Online';
export type Brand = 'Estrella Damm' | 'Voll-Damm' | 'Estrella Daura';
export type Week = 'Week 2' | 'Week 3' | 'Week 4';

export interface MonthlyMetrics {
  market: string;
  month: string;
  salesToDate: number;
  monthlyTarget: number;
  baselineForecast: number;
  expectedGap: number;
  hitProbability: number;
  status: Status;
  lastUpdated: string;
}

export interface ForecastPoint {
  day: string;
  actual: number | null;
  target: number;
  forecast: number | null;
  actionForecast: number | null;
}

export interface GapDriver {
  name: string;
  impact: number;
  share: number;
  explanation: string;
  dimension: string;
}

export interface DemandWindow {
  week: string;
  baselineDemand: DemandLevel;
  promoSensitivity: DemandLevel;
  opportunityScore: number;
  recommendation: Recommendation;
  explanation: string;
}

export interface PlanAction {
  title: string;
  week: string;
  impact: number;
  confidence: number;
  why: string;
}

export interface ActionPlan {
  id: string;
  name: string;
  label: string;
  recommended: boolean;
  goal: string;
  expectedImpact: number;
  forecastAfterAction: number;
  remainingGap: number;
  hitProbability: number;
  risk: Risk;
  explanation: string;
  actions: PlanAction[];
}

export interface ChannelPerformance {
  channel: Channel;
  actual: number;
  target: number;
  gap: number;
}

export interface BrandPerformance {
  brand: string;
  actual: number;
  target: number;
  gap: number;
  share: number;
}

export interface SkuPerformance {
  sku: string;
  name: string;
  actual: number;
  target: number;
  gap: number;
  channel: Channel;
  brand: string;
}

export interface SimulatorOptions {
  intensities: PromoIntensity[];
  channels: Channel[];
  brands: Brand[];
  weeks: Week[];
}

export interface SimulatorResult {
  newForecast: number;
  remainingGap: number;
  hitProbability: number;
  incrementalImpact: number;
}

export interface MetricCardProps {
  title: string;
  value: string;
  delta?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  subtitle?: string;
}

export interface InsightCardProps {
  title: string;
  children: React.ReactNode;
  tone?: Tone;
}

export interface StatusBadgeProps {
  status: string;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
}

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: Omit<Tone, 'neutral'>;
  showLabel?: boolean;
  label?: string;
}
