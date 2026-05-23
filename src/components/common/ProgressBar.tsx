import type { ProgressBarProps } from '../../types';

const toneTrack: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
};

export default function ProgressBar({ value, max = 100, tone = 'warning', showLabel = false, label }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const toneKey = tone as string;

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-[11px] text-ink-500">{label}</span>}
          {showLabel && <span className="text-[11px] font-semibold text-ink-700">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${toneTrack[toneKey] ?? 'bg-ink-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
