import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ExecutivePulse from './components/sections/ExecutivePulse';
import GapDiagnosis from './components/sections/GapDiagnosis';
import DemandWindows from './components/sections/DemandWindows';
import ActionPlanner from './components/sections/ActionPlanner';
import WhatIfSimulator from './components/sections/WhatIfSimulator';
import { navItems } from './constants/navigation';
import type { SectionId } from './constants/navigation';

const sectionMap: Record<SectionId, React.ReactNode> = {
  executive: <ExecutivePulse />,
  gap:       <GapDiagnosis />,
  demand:    <DemandWindows />,
  action:    <ActionPlanner />,
  simulator: <WhatIfSimulator />,
};

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('executive');

  return (
    <div className="min-h-screen bg-cream-100">
      <Sidebar
        items={navItems}
        active={activeSection}
        onSelect={setActiveSection}
      />
      <Header />

      <main
        className="pt-14 pl-60 min-h-screen"
        style={{ paddingLeft: '240px' }}
      >
        <div className="max-w-5xl mx-auto px-6 py-8">
          {sectionMap[activeSection]}
        </div>
      </main>
    </div>
  );
}
