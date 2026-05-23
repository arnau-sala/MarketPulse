import type { StatusBadgeProps, Tone } from '../../types';

const toneClasses: Record<NonNullable<Tone>, string> = {
  success: 'bg-success-light text-success border-success/20',
  warning: 'bg-warning-light text-warning border-warning/20',
  danger:  'bg-danger-light  text-danger  border-danger/20',
  neutral: 'bg-ink-100      text-ink-700  border-ink-300',
};

const sizeClasses = {
  sm:  'text-[10px] px-1.5 py-0.5',
  md:  'text-[11px] px-2   py-0.5',
  lg:  'text-[12px] px-2.5 py-1',
};

const dotColor: Record<NonNullable<Tone>, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  neutral: 'bg-ink-500',
};

export default function StatusBadge({ status, tone = 'neutral', size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold tracking-wide uppercase rounded-full border
        ${toneClasses[tone]} ${sizeClasses[size]}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[tone]}`} />
      {status}
    </span>
  );
}
