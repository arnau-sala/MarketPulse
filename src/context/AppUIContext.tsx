import { createContext, useContext } from 'react';
import type { SectionId } from '../constants/navigation';
import { TARGET_BASELINE_YEAR } from '../data/profitHistory';

interface AppUIContextValue {
  historicalYear: number;
  setHistoricalYear: (year: number) => void;
  openHistoricalData: (year?: number) => void;
  setActiveSection: (section: SectionId) => void;
}

const AppUIContext = createContext<AppUIContextValue | null>(null);

export function AppUIProvider({
  children,
  historicalYear,
  setHistoricalYear,
  openHistoricalData,
  setActiveSection,
}: AppUIContextValue & { children: React.ReactNode }) {
  return (
    <AppUIContext.Provider
      value={{
        historicalYear,
        setHistoricalYear,
        openHistoricalData,
        setActiveSection,
      }}
    >
      {children}
    </AppUIContext.Provider>
  );
}

export function useAppUI() {
  const context = useContext(AppUIContext);

  if (!context) {
    throw new Error('useAppUI must be used within an AppUIProvider');
  }

  return context;
}

export function useOpenBaselineHistorical() {
  const { openHistoricalData } = useAppUI();

  return () => openHistoricalData(TARGET_BASELINE_YEAR);
}
