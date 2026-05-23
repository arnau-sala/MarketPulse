import { BarChart3, TrendingUp, Calendar, Zap, FlaskConical, ChevronRight, X, Target, History } from 'lucide-react';
import type { SectionId, NavItem } from '../../constants/navigation';

const iconMap: Record<SectionId, React.ReactNode> = {
  executive: <BarChart3 size={16} />,
  gap: <TrendingUp size={16} />,
  demand: <Calendar size={16} />,
  action: <Zap size={16} />,
  targets: <Target size={16} />,
  historical: <History size={16} />,
  simulator: <FlaskConical size={16} />,
};

interface SidebarProps {
  items: NavItem[];
  active: SectionId;
  onSelect: (id: SectionId) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ items, active, onSelect, open, onClose }: SidebarProps) {
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 select-none flex-col bg-sidebar transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'rgba(255, 252, 248, 0.98)' }}
      >
        <div className="relative border-b border-ink-200 px-6 pb-6 pt-7 pr-14">
          <div>
            <span className="block text-base font-semibold tracking-tight text-ink-900">MarketPulse</span>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-widest text-ink-500">UK Action Center</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="absolute right-6 top-6 inline-flex h-8 w-8 items-center justify-center text-ink-500 transition-colors hover:text-ink-900"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const isActive = item.id === active;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left transition-all duration-150 group flex items-center gap-3 ${
                  isActive
                    ? 'border border-brand-red/15 bg-brand-red/8 text-ink-900 shadow-[0_1px_0_rgba(15,23,42,0.03)]'
                    : 'border border-transparent text-ink-600 hover:border-ink-200 hover:bg-white hover:text-ink-900'
                }`}
              >
                <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-brand-red' : 'text-ink-400 group-hover:text-ink-600'}`}>
                  {iconMap[item.id]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium leading-tight">{item.label}</span>
                  <span className={`mt-0.5 block truncate text-[11px] leading-tight transition-colors ${isActive ? 'text-ink-500' : 'text-ink-400 group-hover:text-ink-500'}`}>
                    {item.description}
                  </span>
                </span>
                {isActive && <ChevronRight size={12} className="flex-shrink-0 text-brand-red" />}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-ink-200 px-6 py-5">
          <p className="text-[11px] font-medium leading-relaxed text-ink-500">Damm × Engineering HUB</p>
          <p className="mt-0.5 text-[10px] text-ink-400">Hackathon Prototype</p>
        </div>
      </aside>
    </>
  );
}
