export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `£${(value / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `£${(value / 1_000).toFixed(0)}k`;
    }
    return `£${value.toFixed(0)}`;
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDelta(value: number, compact = true): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatCurrency(value, compact)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function progressValue(actual: number, target: number): number {
  return clamp((actual / target) * 100, 0, 100);
}
