import { createContext, useContext, useMemo, useState } from 'react';

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
  lastYearSales: number;
  target: number;
}

interface TargetContextValue {
  months: TargetMonth[];
  currentMonthKey: TargetMonthKey;
  currentMonth: TargetMonth;
  currentMonthTarget: number;
  currentQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  currentQuarterTarget: number;
  annualTarget: number;
  weeklyTarget: number;
  updateTarget: (monthKey: TargetMonthKey, target: number) => void;
}

const currentMonthKey: TargetMonthKey = 'mar';

const monthBlueprints: Array<Pick<TargetMonth, 'key' | 'label' | 'quarter' | 'lastYearSales'>> = [
  { key: 'jan', label: 'Jan', quarter: 'Q1', lastYearSales: 1080000 },
  { key: 'feb', label: 'Feb', quarter: 'Q1', lastYearSales: 1120000 },
  { key: 'mar', label: 'Mar', quarter: 'Q1', lastYearSales: 1091000 },
  { key: 'apr', label: 'Apr', quarter: 'Q2', lastYearSales: 1050000 },
  { key: 'may', label: 'May', quarter: 'Q2', lastYearSales: 1070000 },
  { key: 'jun', label: 'Jun', quarter: 'Q2', lastYearSales: 1090000 },
  { key: 'jul', label: 'Jul', quarter: 'Q3', lastYearSales: 1120000 },
  { key: 'aug', label: 'Aug', quarter: 'Q3', lastYearSales: 1040000 },
  { key: 'sep', label: 'Sep', quarter: 'Q3', lastYearSales: 1030000 },
  { key: 'oct', label: 'Oct', quarter: 'Q4', lastYearSales: 1100000 },
  { key: 'nov', label: 'Nov', quarter: 'Q4', lastYearSales: 1150000 },
  { key: 'dec', label: 'Dec', quarter: 'Q4', lastYearSales: 1210000 },
];

function buildInitialMonths(): TargetMonth[] {
  return monthBlueprints.map((month) => ({
    ...month,
    target: Math.round((month.lastYearSales * 1.1) / 1000) * 1000,
  }));
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
    const weeklyTarget = Math.round(currentMonth.target / 4);

    return {
      months,
      currentMonthKey,
      currentMonth,
      currentMonthTarget: currentMonth.target,
      currentQuarter,
      currentQuarterTarget,
      annualTarget,
      weeklyTarget,
      updateTarget: (monthKey: TargetMonthKey, target: number) => {
        setMonths((currentMonths) =>
          currentMonths.map((month) =>
            month.key === monthKey
              ? {
                  ...month,
                  target: Math.max(month.lastYearSales, Math.round(target)),
                }
              : month,
          ),
        );
      },
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
