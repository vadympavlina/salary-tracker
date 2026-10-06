import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPercent } from '../../utils/format';

/** "+12%" vs previous month. Hidden when there's nothing to compare. */
export function ChangeBadge({ value, onDark = false }: { value: number | null; onDark?: boolean }) {
  if (value === null) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`change change--${up ? 'up' : 'down'}${onDark ? ' change--on-dark' : ''}`} title="Порівняно з попереднім місяцем">
      <Icon size={13} strokeWidth={2.4} aria-hidden="true" />
      <span className="num">{formatPercent(value)}</span>
      <span className="sr-only"> порівняно з попереднім місяцем</span>
    </span>
  );
}
