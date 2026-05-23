import type { MetricCardProps, Tone } from '../../types';

const toneBorder: Record<NonNullable<Tone>, string> = {
  neutral: 'border-ink-300/60',
  success: 'border-success/30',
  warning: 'border-warning/30',
  danger:  'border-danger/30',
};

const toneValue: Record<NonNullable<Tone>, string> = {
  neutral: 'text-ink-900',
  success: 'text-success',
  warning: 'text-warning',
  danger:  'text-danger',
};

const toneBg: Record<NonNullable<Tone>, string> = {
  neutral: '',
  success: 'bg-success-light/40',
  warning: 'bg-warning-light/40',
  danger:  'bg-danger-light/40',
};

export default function MetricCard({ title, value, delta, tone = 'neutral', icon, subtitle }: MetricCardProps) {
  return (
    <div className={`bg-white rounded-2xl border shadow-card px-5 py-4 flex flex-col gap-1 ${toneBorder[tone]} ${toneBg[tone]}`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">{title}</span>
        {icon && <span className={`${toneValue[tone]} opacity-60`}>{icon}</span>}
      </div>
      <span className={`text-2xl font-bold leading-none ${toneValue[tone]}`}>{value}</span>
      {delta && (
        <span className={`text-[12px] font-medium ${toneValue[tone]}`}>{delta}</span>
      )}
      {subtitle && (
        <span className="text-[11px] text-ink-500 leading-snug mt-0.5">{subtitle}</span>
      )}
    </div>
  );
}
