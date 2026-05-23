import { Clock, ChevronDown, Menu, X } from 'lucide-react';
import { monthlyMetrics } from '../../data/mockData';
import StatusBadge from '../common/StatusBadge';

const selectClass =
  'appearance-none bg-white border border-ink-300 rounded-lg px-3 py-1.5 text-[12px] text-ink-700 font-medium cursor-pointer pr-7 relative hover:border-ink-500 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red/20';

interface SelectProps {
  label: string;
  options: string[];
}

function MockSelect({ label, options }: SelectProps) {
  return (
    <div className="relative">
      <select className={selectClass} defaultValue={options[0]}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
      <span className="absolute -top-[9px] left-2 bg-cream-50 px-1 text-[10px] text-ink-500 font-medium">
        {label}
      </span>
    </div>
  );
}

interface HeaderProps {
  open: boolean;
  onToggle: () => void;
}

export default function Header({ open, onToggle }: HeaderProps) {
  return (
    <header
      className="fixed top-0 right-0 h-14 bg-cream-50/95 backdrop-blur-sm border-b border-ink-300/60 z-20 flex items-center px-4 sm:px-6 gap-4 transition-[left] duration-300 ease-out"
      style={{ left: open ? '240px' : '0px' }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? 'Close sidebar' : 'Open sidebar'}
        aria-pressed={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-300/70 bg-white text-ink-700 transition-colors hover:border-ink-500 hover:text-ink-900"
      >
        {open ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Market & month */}
      <div className="flex items-center gap-3 mr-auto min-w-0">
        <div>
          <span className="text-[13px] font-semibold text-ink-900">{monthlyMetrics.market}</span>
          <span className="text-[13px] text-ink-500 mx-1.5">·</span>
          <span className="text-[13px] text-ink-700">{monthlyMetrics.month}</span>
        </div>
        <StatusBadge status={monthlyMetrics.status} tone="warning" size="sm" />
      </div>

      {/* Filters */}
      <div className="hidden lg:flex items-center gap-4">
        <MockSelect label="Month"    options={['March 2025', 'February 2025', 'January 2025']} />
        <MockSelect label="Channel"  options={['All Channels', 'Off-Trade', 'On-Trade', 'Online']} />
        <MockSelect label="Brand"    options={['All Brands', 'Estrella Damm', 'Voll-Damm', 'Estrella Daura']} />
        <MockSelect label="Scenario" options={['Balanced Recovery', 'Conservative', 'Aggressive']} />
      </div>

      {/* Last updated */}
      <div className="hidden md:flex items-center gap-1.5 ml-2 text-ink-500">
        <Clock size={12} />
        <span className="text-[11px]">{monthlyMetrics.lastUpdated}</span>
      </div>
    </header>
  );
}
