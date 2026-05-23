interface EmptyStateProps {
  title?: string;
  description?: string;
}

export default function EmptyState({ title = 'No data available', description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-ink-100 flex items-center justify-center mb-3">
        <span className="text-2xl">📊</span>
      </div>
      <p className="text-[14px] font-semibold text-ink-700">{title}</p>
      {description && <p className="mt-1 text-[13px] text-ink-500 max-w-xs">{description}</p>}
    </div>
  );
}
