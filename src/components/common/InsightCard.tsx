import { Lightbulb, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { InsightCardProps, Tone } from '../../types';

const toneStyles: Record<NonNullable<Tone>, { bg: string; border: string; title: string; icon: React.ReactNode }> = {
  neutral: {
    bg: 'bg-ink-100/60',
    border: 'border-ink-300/60',
    title: 'text-ink-700',
    icon: <Info size={15} className="text-ink-500" />,
  },
  success: {
    bg: 'bg-success-light/60',
    border: 'border-success/20',
    title: 'text-success',
    icon: <CheckCircle2 size={15} className="text-success" />,
  },
  warning: {
    bg: 'bg-warning-light/70',
    border: 'border-warning/25',
    title: 'text-warning',
    icon: <AlertTriangle size={15} className="text-warning" />,
  },
  danger: {
    bg: 'bg-danger-light/60',
    border: 'border-danger/20',
    title: 'text-danger',
    icon: <AlertTriangle size={15} className="text-danger" />,
  },
};

export default function InsightCard({ title, children, tone = 'neutral' }: InsightCardProps) {
  const s = toneStyles[tone];
  return (
    <div className={`rounded-2xl border px-5 py-4 ${s.bg} ${s.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb size={14} className={s.title} />
        <span className={`text-[12px] font-semibold uppercase tracking-wider ${s.title}`}>{title}</span>
      </div>
      <div className="text-[13px] text-ink-700 leading-relaxed">{children}</div>
    </div>
  );
}
