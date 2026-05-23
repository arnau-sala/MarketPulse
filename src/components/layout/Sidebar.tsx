import { BarChart3, TrendingUp, Calendar, Zap, FlaskConical, ChevronRight } from 'lucide-react';
import type { SectionId, NavItem } from '../../constants/navigation';

const iconMap: Record<SectionId, React.ReactNode> = {
  executive: <BarChart3 size={16} />,
  gap:       <TrendingUp size={16} />,
  demand:    <Calendar size={16} />,
  action:    <Zap size={16} />,
  simulator: <FlaskConical size={16} />,
};

interface SidebarProps {
  items: NavItem[];
  active: SectionId;
  onSelect: (id: SectionId) => void;
}

export default function Sidebar({ items, active, onSelect }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-sidebar flex flex-col z-30 select-none">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-7 h-7 rounded-lg bg-brand-red flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold tracking-tight font-display">MP</span>
          </div>
          <span className="text-white font-semibold text-base tracking-tight">MarketPulse</span>
        </div>
        <p className="text-white/40 text-[11px] font-medium tracking-widest uppercase pl-9">
          UK Action Center
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group
                ${isActive
                  ? 'bg-white/[0.10] text-white'
                  : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                }
              `}
            >
              <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-brand-red' : 'text-white/30 group-hover:text-white/50'}`}>
                {iconMap[item.id]}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium leading-tight truncate">
                  {item.label}
                </span>
                <span className={`block text-[11px] leading-tight mt-0.5 truncate transition-colors ${isActive ? 'text-white/40' : 'text-white/25 group-hover:text-white/35'}`}>
                  {item.description}
                </span>
              </span>
              {isActive && (
                <ChevronRight size={12} className="text-white/30 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-white/[0.07]">
        <p className="text-white/25 text-[11px] font-medium leading-relaxed">
          Damm × Engineering HUB
        </p>
        <p className="text-white/15 text-[10px] mt-0.5">Hackathon Prototype</p>
      </div>
    </aside>
  );
}
