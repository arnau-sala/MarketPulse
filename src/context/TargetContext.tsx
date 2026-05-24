import { createContext, useContext, useMemo, useState } from 'react';
import {
  computeDefaultMonthlyTarget,
  getMonthlyNetProfitAverage,
} from '../data/profitHistory';
import {
  DEMO_MONTHLY_TARGET_GBP,
  DEMO_WEEKLY_TARGET_GBP,
} from '../config/demoConfig';

export type TargetMonthKey =
  | 'jan'
  | 'feb'
  | 'mar'
  | 'apr'
  | 'may'
  | 'jun'
  | 'jul'
  | 'aug'
  | 'sep'
  | 'oct'
  | 'nov'
  | 'dec';

export interface TargetMonth {
  key: TargetMonthKey;
  label: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  /** Mean net profit for this month over the last 3 baseline years. */
  baselineAverage: number;
  /** Default target derived from baselineAverage (+10%). */
  defaultTarget: number;
  target: number;
}

type UpdateTarget = {
  (target: number): void;
  (monthKey: TargetMonthKey, target: number): void;
};

interface TargetContextValue {
  months: TargetMonth[];
  currentMonthKey: TargetMonthKey;
  currentMonth: TargetMonth;
  currentMonthTarget: number;
  currentQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  currentQuarterTarget: number;
  quarterlyTarget: number;
  annualTarget: number;
  weeklyTarget: number;
  updateTarget: UpdateTarget;
}

const currentMonthKey: TargetMonthKey = 'may';

const monthDefinitions: Array<{
  key: TargetMonthKey;
  label: string;
  quarter: TargetMonth['quarter'];
  monthNumber: number;
}> = [
  { key: 'jan', label: 'Jan', quarter: 'Q1', monthNumber: 1 },
  { key: 'feb', label: 'Feb', quarter: 'Q1', monthNumber: 2 },
  { key: 'mar', label: 'Mar', quarter: 'Q1', monthNumber: 3 },
  { key: 'apr', label: 'Apr', quarter: 'Q2', monthNumber: 4 },
  { key: 'may', label: 'May', quarter: 'Q2', monthNumber: 5 },
  { key: 'jun', label: 'Jun', quarter: 'Q2', monthNumber: 6 },
  { key: 'jul', label: 'Jul', quarter: 'Q3', monthNumber: 7 },
  { key: 'aug', label: 'Aug', quarter: 'Q3', monthNumber: 8 },
  { key: 'sep', label: 'Sep', quarter: 'Q3', monthNumber: 9 },
  { key: 'oct', label: 'Oct', quarter: 'Q4', monthNumber: 10 },
  { key: 'nov', label: 'Nov', quarter: 'Q4', monthNumber: 11 },
  { key: 'dec', label: 'Dec', quarter: 'Q4', monthNumber: 12 },
];

function buildInitialMonths(): TargetMonth[] {
  return monthDefinitions.map((month) => {
    const baselineAverage = getMonthlyNetProfitAverage(month.monthNumber);
    const defaultTarget = computeDefaultMonthlyTarget(baselineAverage);

    return {
      key: month.key,
      label: month.label,
      quarter: month.quarter,
      baselineAverage,
      defaultTarget,
      target: month.key === currentMonthKey ? DEMO_MONTHLY_TARGET_GBP : defaultTarget,
    };
  });
}

const TargetContext = createContext<TargetContextValue | null>(null);

export function TargetProvider({ children }: { children: React.ReactNode }) {
  const [months, setMonths] = useState<TargetMonth[]>(buildInitialMonths);

  const value = useMemo<TargetContextValue>(() => {
    const currentMonth = months.find((month) => month.key === currentMonthKey) ?? months[0];
    const currentQuarter = currentMonth.quarter;
    const currentQuarterTarget = months
      .filter((month) => month.quarter === currentQuarter)
      .reduce((sum, month) => sum + month.target, 0);
    const annualTarget = months.reduce((sum, month) => sum + month.target, 0);
    const weeklyTarget = Math.round(currentMonth.target / 4.33);

    const updateTarget: UpdateTarget = (monthOrTarget: TargetMonthKey | number, maybeTarget?: number) => {
      const monthKey = typeof monthOrTarget === 'string' ? monthOrTarget : currentMonthKey;
      const target = typeof monthOrTarget === 'number' ? monthOrTarget : maybeTarget ?? 0;

      setMonths((currentMonths) =>
        currentMonths.map((month) =>
          month.key === monthKey
            ? {
                ...month,
                target: Math.max(0, Math.round(target)),
              }
            : month,
        ),
      );
    };

    return {
      months,
      currentMonthKey,
      currentMonth,
      currentMonthTarget: currentMonth.target,
      currentQuarter,
      currentQuarterTarget,
      quarterlyTarget: currentQuarterTarget,
      annualTarget,
      weeklyTarget,
      updateTarget,
    };
  }, [months]);

  return <TargetContext.Provider value={value}>{children}</TargetContext.Provider>;
}

export function useTargetPlan() {
  const context = useContext(TargetContext);

  if (!context) {
    throw new Error('useTargetPlan must be used within a TargetProvider');
  }

  return context;
}

export {
  DEMO_MONTHLY_TARGET_GBP as DEFAULT_MONTHLY_TARGET,
  DEMO_WEEKLY_TARGET_GBP as DEFAULT_WEEKLY_TARGET,
};
