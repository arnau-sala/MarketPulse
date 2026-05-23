import type { SectionHeaderProps } from '../../types';

export default function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="text-[11px] font-semibold text-brand-red uppercase tracking-widest mb-1.5">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[26px] font-bold text-ink-900 leading-tight font-display">{title}</h1>
      {description && (
        <p className="mt-1.5 text-[14px] text-ink-500 leading-relaxed max-w-2xl">{description}</p>
      )}
    </div>
  );
}
