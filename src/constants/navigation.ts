export type SectionId =
  | 'executive'
  | 'gap'
  | 'demand'
  | 'action'
  | 'simulator';

export interface NavItem {
  id: SectionId;
  label: string;
  description: string;
  question: string;
}

export const navItems: NavItem[] = [
  {
    id: 'executive',
    label: 'Executive Pulse',
    description: 'Monthly performance overview',
    question: 'Will UK hit the March target?',
  },
  {
    id: 'gap',
    label: 'Gap Diagnosis',
    description: 'Root cause analysis',
    question: 'What is driving the gap?',
  },
  {
    id: 'demand',
    label: 'Demand Windows',
    description: 'Best moments to act',
    question: 'When should we act?',
  },
  {
    id: 'action',
    label: 'Action Planner',
    description: 'Recovery plans ranked by ROI',
    question: 'What should we do now?',
  },
  {
    id: 'simulator',
    label: 'What-if Simulator',
    description: 'Scenario impact simulation',
    question: 'What happens if we change the plan?',
  },
];
