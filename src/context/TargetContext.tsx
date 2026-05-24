/**
 * BudgetContext — provides the monthly sales target for the demo.
 *
 * Uses demoConfig constants (May 2026 planning targets) instead of deriving
 * targets from net-profit history, which is irrelevant to this challenge.
 * The UI can still call updateTarget() to override values interactively.
 */
import { createContext, useContext, useMemo, useState } from 'react';
import {
  DEMO_MONTHLY_TARGET_GBP,
  DEMO_WEEKLY_TARGET_GBP,
  DEMO_QUARTERLY_TARGET_GBP,
  DEMO_ANNUAL_TARGET_GBP,
} from '../config/demoConfig';

interface BudgetContextValue {
  currentMonthTarget: number;
  weeklyTarget: number;
  quarterlyTarget: number;
  annualTarget: number;
  updateTarget: (target: number) => void;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function TargetProvider({ children }: { children: React.ReactNode }) {
  const [monthlyTarget, setMonthlyTarget] = useState(DEMO_MONTHLY_TARGET_GBP);

  const value = useMemo<BudgetContextValue>(
    () => ({
      currentMonthTarget: monthlyTarget,
      weeklyTarget: Math.round(monthlyTarget / 4.33),
      quarterlyTarget: DEMO_QUARTERLY_TARGET_GBP,
      annualTarget: DEMO_ANNUAL_TARGET_GBP,
      updateTarget: (t: number) => setMonthlyTarget(Math.max(0, Math.round(t))),
    }),
    [monthlyTarget],
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useTargetPlan() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useTargetPlan must be used within a TargetProvider');
  }
  return context;
}

// Re-export defaults so callers that imported from here still compile
export {
  DEMO_MONTHLY_TARGET_GBP as DEFAULT_MONTHLY_TARGET,
  DEMO_WEEKLY_TARGET_GBP as DEFAULT_WEEKLY_TARGET,
};
