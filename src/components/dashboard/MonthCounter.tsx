import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CirclePlay, Minus, Plus, UsersRound } from 'lucide-react';
import { useSalary } from '../../hooks/useSalaryStore';
import { calculateSalary } from '../../services/calculations/salaryCalculator';
import { currentPeriod, formatMonth, formatPeriod } from '../../utils/period';
import type { RateLine } from '../../types/salary';
import { formatNumber, formatUAH, plural } from '../../utils/format';
import { Link } from '../../router/router';
import { useToast } from '../ui/Toast';
import { Group, Tile } from '../ui/List';

type Kind = 'pairs' | 'videos';

/**
 * Quick tally under the home card: one row per rate line of the month (pairs at 350 ₴, pairs at
 * 400 ₴ "Група А", videos …) with −/+ on each, so a month with several rates is counted right.
 * Defaults to the current month; tapping +1 there creates the month if it doesn't exist yet.
 */
export function MonthCounter({ period = currentPeriod() }: { period?: string }) {
  const { findByPeriod, bumpCurrentMonth, settings } = useSalary();
  const record = findByPeriod(period);
  const calc = record ? calculateSalary(record) : undefined;
  const isCurrent = period === currentPeriod();
  const pairLines = record?.pairItems.length ? record.pairItems : [{ count: 0, rate: settings.pairRate }];
  const videoLines = record?.videoItems.length ? record.videoItems : [{ count: 0, rate: settings.videoRate }];
  const total = (calc?.pairIncome ?? 0) + (calc?.videoIncome ?? 0);

  const rows = (kind: Kind, lines: RateLine[]) =>
    lines.map((l, i) => {
      const base = kind === 'pairs' ? 'Пари' : 'Відео';
      const label = l.note ? `${base} · ${l.note}` : lines.length > 1 ? `${base} · ставка ${i + 1}` : base;
      return (
        <CounterRow
          key={`${kind}-${i}`}
          kind={kind}
          label={label}
          forms={kind === 'pairs' ? ['пара', 'пари', 'пар'] : ['відео', 'відео', 'відео']}
          value={l.count}
          detail={`× ${formatUAH(l.rate)} · ${formatUAH(l.count * l.rate)}`}
          icon={
            <Tile color={kind === 'pairs' ? 'violet' : 'blue'}>
              {kind === 'pairs' ? <UsersRound size={17} strokeWidth={2.4} /> : <CirclePlay size={17} strokeWidth={2.4} />}
            </Tile>
          }
          onBump={(k, delta) => bumpCurrentMonth(k, delta, { period, line: i })}
        />
      );
    });

  return (
    <Group
      className="counter"
      id="counter"
      title={isCurrent ? `Цей місяць · ${formatMonth(period)}` : formatPeriod(period)}
      action={
        record ? (
          <Link to={`/history/${record.id}`} className="link">
            Відкрити
          </Link>
        ) : undefined
      }
      footer={
        <span className="counter__footer">
          <span>За пари й відео</span>
          <b className="num">{formatUAH(total)}</b>
        </span>
      }
    >
      {rows('pairs', pairLines)}
      {rows('videos', videoLines)}
    </Group>
  );
}

interface RowProps {
  kind: Kind;
  label: string;
  forms: [string, string, string];
  value: number;
  detail: string;
  icon: ReactNode;
  onBump: (kind: Kind, delta: number) => Promise<unknown>;
}

function CounterRow({ kind, label, forms, value, detail, icon, onBump }: RowProps) {
  const toast = useToast();
  const [pop, setPop] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const valueRef = useRef(value);
  valueRef.current = value;

  const bump = (delta: 1 | -1) => {
    if (delta < 0 && valueRef.current <= 0) return;
    valueRef.current += delta; // optimistic: lets press-and-hold keep counting before the save lands
    onBump(kind, delta).catch(() => {
      valueRef.current -= delta;
      toast('Не вдалося зберегти. Перевір вільне місце в браузері.', { tone: 'error' });
    });
    setPop((n) => n + 1);
    if ('vibrate' in navigator) navigator.vibrate?.(5);
  };
  const stop = () => {
    window.clearTimeout(timer.current);
    window.clearInterval(timer.current);
    timer.current = undefined;
  };
  useEffect(() => stop, []);
  const start = (delta: 1 | -1) => {
    bump(delta);
    stop();
    timer.current = window.setTimeout(() => {
      timer.current = window.setInterval(() => bump(delta), 110);
    }, 420);
  };
  const press = (delta: 1 | -1) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      start(delta);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        bump(delta);
      }
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="counter__row">
      {icon}
      <span className="counter__label">
        <b>{label}</b>
        <small className="num">{detail}</small>
      </span>
      <span key={pop} className="counter__value num pop" aria-live="polite" aria-atomic="true">
        {formatNumber(value)}
        <span className="sr-only"> {plural(value, forms)}</span>
      </span>
      <span className="counter__controls">
        <button type="button" className="counter__btn" aria-label={`${label}: мінус один`} disabled={value <= 0} {...press(-1)}>
          <Minus size={19} strokeWidth={2.6} />
        </button>
        <button type="button" className="counter__btn counter__btn--plus" aria-label={`${label}: плюс один`} {...press(1)}>
          <Plus size={21} strokeWidth={2.8} />
        </button>
      </span>
    </div>
  );
}
