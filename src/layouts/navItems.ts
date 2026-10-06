import { ChartColumn, Calculator, House, Layers, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Paths that keep this tab highlighted. */
  match: (path: string) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Головна', icon: House, match: (p) => p === '/' },
  { to: '/calculate', label: 'Розрахунок', icon: Calculator, match: (p) => p.startsWith('/calculate') },
  { to: '/history', label: 'Історія', icon: Layers, match: (p) => p.startsWith('/history') },
  { to: '/analytics', label: 'Аналітика', icon: ChartColumn, match: (p) => p.startsWith('/analytics') },
];
