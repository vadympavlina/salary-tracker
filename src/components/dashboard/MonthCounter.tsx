import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CirclePlay, Minus, Plus, UsersRound } from 'lucide-react';
import { useSalary } from '../../hooks/useSalaryStore';
import { calculateSalary } from '../../services/calculations/salaryCalculator';
import { currentPeriod, formatPeriod } from '../../utils/period';
import { formatNumber, formatUAH, plural } from '../../utils/format';
import { Link } from '../../router/router';

type Kind = 'pairs' | 'videos';

/**
 * Running tally for the current month: tap +1 after each class / checked video,
 * so the month is already filled in when it's time to calculate.
 */
export function MonthCounter() {
  const { findByPeriod, bumpCurrentMonth } = useSalary();
  const period = currentPeriod();
  const record = findByPeriod(period);
  const calc = record ? calculateSalary(record) : undefined;
  const pairs = calc?.pairs ?? 0;
  const videos = calc?.videos ?? 0;
  const earned = (calc?.pairIncome ?? 0) + (calc?.videoIncome ?? 0);

  return (
    <section className="counter card" aria-labelledby="counter-title">
      <div className="counter__head">
        <div>
          <h2 id="counter-title" className="card__title">
            Цей місяць
          </h2>
          <p className="counter__sub">{formatPeriod(period)} · рахуй по ходу роботи</p>
        </div>
        {record && (
          <Link to={`/history/${record.id}`} className="link">
            Відкрити
          </Link>
        )}
      </div>
      <CounterRow kind="pairs" label="Пари" forms={['пара', 'пари', 'пар']} value={pairs} icon={<UsersRound size={20} />} onBump={bumpCurrentMonth} />
      <CounterRow kind="videos" label="Відео" forms={['відео', 'відео', 'відео']} value={videos} icon={<CirclePlay size={20} />} onBump={bumpCurrentMonth} />
      <p className="counter__total">
        За пари й відео: <b className="num">{formatUAH(earned)}</b>
      </p>
    </section>
  );
}

interface RowProps {
  kind: Kind;
  label: string;
  forms: [string, string, string];
  value: number;
  icon: ReactNode;
  onBump: (kind: Kind, delta: number) => Promise<unknown>;
}

function CounterRow({ kind, label, forms, value, icon, onBump }: RowProps) {
  const [pop, setPop] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const valueRef = useRef(value);
  valueRef.current = value;

  const bump = (delta: 1 | -1) => {
    if (delta < 0 && valueRef.current <= 0) return;
    valueRef.current += delta; // optimistic: lets press-and-hold keep counting before the save lands
    void onBump(kind, delta);
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
      <span className="counter__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="counter__label">{label}</span>
      <span key={pop} className="counter__value num pop" aria-live="polite" aria-atomic="true">
        {formatNumber(value)}
        <span className="sr-only"> {plural(value, forms)}</span>
      </span>
      <button type="button" className="counter__btn" aria-label={`${label}: мінус один`} disabled={value <= 0} {...press(-1)}>
        <Minus size={20} strokeWidth={2.4} />
      </button>
      <button type="button" className="counter__btn counter__btn--plus" aria-label={`${label}: плюс один`} {...press(1)}>
        <Plus size={22} strokeWidth={2.6} />
      </button>
    </div>
  );
}
