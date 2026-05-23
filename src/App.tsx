import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import ExecutivePulse from './components/sections/ExecutivePulse';
import GapDiagnosis from './components/sections/GapDiagnosis';
import DemandWindows from './components/sections/DemandWindows';
import ActionPlanner from './components/sections/ActionPlanner';
import TargetPlanning from './components/sections/TargetPlanning';
import WhatIfSimulator from './components/sections/WhatIfSimulator';
import { navItems } from './constants/navigation';
import type { SectionId } from './constants/navigation';
import { Menu } from 'lucide-react';
import { TargetProvider } from './context/TargetContext';

const sectionMap: Record<SectionId, React.ReactNode> = {
  executive: <ExecutivePulse />,
  gap:       <GapDiagnosis />,
  demand:    <DemandWindows />,
  action:    <ActionPlanner />,
  targets:   <TargetPlanning />,
  simulator: <WhatIfSimulator />,
};

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('executive');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <TargetProvider>
      <div className="min-h-screen bg-cream-100">
        <Sidebar
          items={navItems}
          active={activeSection}
          onSelect={setActiveSection}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-white hover:text-ink-900"
          >
            <Menu size={18} />
          </button>
        )}

        <main
          className="min-h-screen transition-[padding] duration-300 ease-out"
          style={{ paddingLeft: sidebarOpen ? '240px' : '0px' }}
        >
          <div className="max-w-5xl mx-auto px-6 py-8">
            {sectionMap[activeSection]}
          </div>
        </main>
      </div>
    </TargetProvider>
  );
}
