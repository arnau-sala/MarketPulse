export interface NetProfitHistoryMonth {
  month: string;
  monthNumber: number;
  netProfitGbp: number;
}

export interface NetProfitHistoryYear {
  year: number;
  months: NetProfitHistoryMonth[];
}

export const netProfitHistory: NetProfitHistoryYear[] = [
  { year: 2023, months: [
    { month: 'Jan', monthNumber: 1, netProfitGbp: 716452 },
    { month: 'Feb', monthNumber: 2, netProfitGbp: 1317737 },
    { month: 'Mar', monthNumber: 3, netProfitGbp: 1990977 },
    { month: 'Apr', monthNumber: 4, netProfitGbp: 1603757 },
    { month: 'May', monthNumber: 5, netProfitGbp: 1485133 },
    { month: 'Jun', monthNumber: 6, netProfitGbp: 2334834 },
    { month: 'Jul', monthNumber: 7, netProfitGbp: 1480454 },
    { month: 'Aug', monthNumber: 8, netProfitGbp: 2080513 },
    { month: 'Sep', monthNumber: 9, netProfitGbp: 1570863 },
    { month: 'Oct', monthNumber: 10, netProfitGbp: 1020954 },
    { month: 'Nov', monthNumber: 11, netProfitGbp: 1585501 },
    { month: 'Dec', monthNumber: 12, netProfitGbp: 1916714 },
  ] },
  { year: 2024, months: [
    { month: 'Jan', monthNumber: 1, netProfitGbp: 1106540 },
    { month: 'Feb', monthNumber: 2, netProfitGbp: 943406 },
    { month: 'Mar', monthNumber: 3, netProfitGbp: 780747 },
    { month: 'Apr', monthNumber: 4, netProfitGbp: 1009783 },
    { month: 'May', monthNumber: 5, netProfitGbp: 1536704 },
    { month: 'Jun', monthNumber: 6, netProfitGbp: 1024815 },
    { month: 'Jul', monthNumber: 7, netProfitGbp: 2500968 },
    { month: 'Aug', monthNumber: 8, netProfitGbp: 1503381 },
    { month: 'Sep', monthNumber: 9, netProfitGbp: 1059955 },
    { month: 'Oct', monthNumber: 10, netProfitGbp: 1868093 },
    { month: 'Nov', monthNumber: 11, netProfitGbp: 1583465 },
    { month: 'Dec', monthNumber: 12, netProfitGbp: 900497 },
  ] },
  { year: 2025, months: [
    { month: 'Jan', monthNumber: 1, netProfitGbp: 643769 },
    { month: 'Feb', monthNumber: 2, netProfitGbp: 982792 },
    { month: 'Mar', monthNumber: 3, netProfitGbp: 1114679 },
    { month: 'Apr', monthNumber: 4, netProfitGbp: 1741636 },
    { month: 'May', monthNumber: 5, netProfitGbp: 1925331 },
    { month: 'Jun', monthNumber: 6, netProfitGbp: 978410 },
    { month: 'Jul', monthNumber: 7, netProfitGbp: 2192231 },
    { month: 'Aug', monthNumber: 8, netProfitGbp: 1201160 },
    { month: 'Sep', monthNumber: 9, netProfitGbp: 1767384 },
    { month: 'Oct', monthNumber: 10, netProfitGbp: 1104668 },
    { month: 'Nov', monthNumber: 11, netProfitGbp: 1224950 },
    { month: 'Dec', monthNumber: 12, netProfitGbp: 1309456 },
  ] },
  { year: 2026, months: [
    { month: 'Jan', monthNumber: 1, netProfitGbp: 727381 },
    { month: 'Feb', monthNumber: 2, netProfitGbp: 1163806 },
    { month: 'Mar', monthNumber: 3, netProfitGbp: 2412899 },
    { month: 'Apr', monthNumber: 4, netProfitGbp: 2307883 },
  ] },
];

/**
 * Baseline year shown by default in Historical Data / Target Planning links.
 * The "current" trading year — adjust if the dataset advances.
 */
export const TARGET_BASELINE_YEAR = 2025;

/**
 * Years used as the baseline window for computing default targets.
 * Last three full historical years (excluding the in-progress current year).
 */
const BASELINE_YEARS = [2023, 2024, 2025] as const;

/** Default monthly target uplift over the baseline average (+10%). */
const TARGET_UPLIFT_PCT = 0.1;

/**
 * Mean net profit (GBP) for a given calendar month across the baseline years.
 * Falls back to 0 when no data exists for the requested month.
 */
export function getMonthlyNetProfitAverage(monthNumber: number): number {
  const samples = BASELINE_YEARS.map((year) =>
    netProfitHistory
      .find((block) => block.year === year)
      ?.months.find((month) => month.monthNumber === monthNumber)?.netProfitGbp,
  ).filter((value): value is number => typeof value === 'number');

  if (samples.length === 0) {
    return 0;
  }

  const total = samples.reduce((sum, value) => sum + value, 0);
  return Math.round(total / samples.length);
}

/**
 * Default target derived from the baseline average — applies the standard
 * uplift and rounds to the nearest 10k to keep planning numbers tidy.
 */
export function computeDefaultMonthlyTarget(baselineAverage: number): number {
  return Math.round((baselineAverage * (1 + TARGET_UPLIFT_PCT)) / 10000) * 10000;
}
