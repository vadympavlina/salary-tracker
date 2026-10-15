import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Clock3, Plus, WalletCards } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { calculateSalary, percentChange } from '../services/calculations/salaryCalculator';
import { currentPeriod, formatMonth, formatMonthShort, formatPeriod, shiftPeriod } from '../utils/period';
import { formatCompact, formatUAH, plural } from '../utils/format';
import { Link } from '../router/router';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SalaryCard } from '../components/salary/SalaryCard';
import { MonthCounter } from '../components/dashboard/MonthCounter';
import { ChartCard } from '../components/analytics/ChartCard';
import { BarChart } from '../components/analytics/BarChart';
import { buildMonthlySeries } from '../services/calculations/analytics';
import type { SalaryRecord } from '../types/salary';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function HomePage() {
  const { records, profile, findByPeriod } = useSalary();
  // Which month the card shows. Defaults to this month (once it exists), else the latest one.
  const [picked, setPicked] = useState<string | null>(null);
  const current = findByPeriod(currentPeriod());
  const selected = (picked && records.find((r) => r.period === picked)) || current || records[0];

  const header = (
    <PageHeader
      eyebrow={`Привіт, ${profile.firstName}`}
      title="Зарплата"
      actions={
        <>
          <IconButton label="Новий розрахунок" to="/calculate?new=1" tone="accent">
            <Plus size={22} strokeWidth={2.6} />
          </IconButton>
          <Link to="/settings" className="avatar avatar--sm header-avatar only-mobile" aria-label="Профіль" title="Профіль і налаштування">
            {initials(profile.fullName)}
          </Link>
        </>
      }
    />
  );

  if (!selected) {
    return (
      <>
        {header}
        <div className="stack">
          <MonthCounter />
          <EmptyState
            icon={<WalletCards size={30} />}
            title="Поки що немає розрахунків"
            text="Рахуй пари й відео лічильником вище або створи перший розрахунок."
            action={
              <Button to="/calculate?new=1" icon={<Plus size={20} />}>
                Новий розрахунок
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const calc = calculateSalary(selected);
  const prev = findByPeriod(shiftPeriod(selected.period, -1));
  const change = percentChange(calc.grossIncome, prev ? calculateSalary(prev).grossIncome : undefined);
  // Older months that still owe money, newest first (the selected one already shows it on the card).
  const waiting = records.filter((r) => r.id !== selected.id && calculateSalary(r).remaining > 0);

  return (
    <>
      {header}
      <div className="dashboard">
        <div className="dashboard__main stack">
          <div className="home-month">
            <MonthChips records={records} selected={selected} onPick={setPicked} />
            <SalaryCard record={selected} calc={calc} change={change} to={`/history/${selected.id}`} variant="dark" />
          </div>
          <MonthCounter period={selected.period} />
          {waiting.length > 0 && <WaitingBanner records={waiting} />}
        </div>
        <div className="dashboard__side stack">
          {records.length > 1 && (
            <div className="desktop-only">
              <ChartCard title="Динаміка доходу" subtitle="Нараховано за останні місяці" action={<Link to="/analytics" className="link">Аналітика</Link>}>
                <BarChart
                  data={buildMonthlySeries(records, 6).map((p) => ({ key: p.period, label: formatMonthShort(p.period), title: formatPeriod(p.period), value: p.gross }))}
                  format={formatUAH}
                  axisFormat={formatCompact}
                  ariaLabel="Нараховано по місяцях"
                  height={170}
                />
              </ChartCard>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Horizontal month switcher above the card; a dot marks months that still owe money. */
function MonthChips({ records, selected, onPick }: { records: SalaryRecord[]; selected: SalaryRecord; onPick: (period: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = useMemo(() => records.map((r) => ({ id: r.id, period: r.period, waiting: calculateSalary(r).remaining > 0 })), [records]);
  const thisYear = currentPeriod().slice(0, 4);

  // Keep the chosen chip in view. (Scrolls the strip itself: scrollIntoView would also move
  // the browser's Tab starting point and the page.)
  useEffect(() => {
    const strip = ref.current;
    const chip = strip?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!strip || !chip) return;
    const left = chip.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + chip.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: Math.max(0, left - 16), behavior: 'smooth' });
    }
  }, [selected.period]);

  // Radio-group keyboard pattern: arrows move between months, only the chosen chip is a Tab stop.
  const onKey = (e: React.KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = items.findIndex((m) => m.period === selected.period);
    const next = items[Math.min(items.length - 1, Math.max(0, i + dir))];
    onPick(next.period);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
  };

  if (items.length < 2) return null;
  return (
    <div ref={ref} className="month-chips" role="radiogroup" aria-label="Місяць" onKeyDown={onKey}>
      {items.map((m) => {
        const on = m.period === selected.period;
        return (
          <button key={m.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} className={`month-chip${on ? ' is-on' : ''}`} onClick={() => onPick(m.period)}>
            {formatMonth(m.period)}
            {m.period.slice(0, 4) !== thisYear && <span className="month-chip__year">{m.period.slice(2, 4)}</span>}
            {m.waiting && (
              <span className="month-chip__dot">
                <span className="sr-only">, очікує виплату</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function WaitingBanner({ records }: { records: SalaryRecord[] }) {
  const first = records[0];
  const total = records.reduce((s, r) => s + calculateSalary(r).remaining, 0);
  const text =
    records.length === 1
      ? `${formatMonth(first.period)} ще очікує ${formatUAH(total)}`
      : `${records.length} ${plural(records.length, ['місяць', 'місяці', 'місяців'])} ще очікують ${formatUAH(total)}`;
  return (
    <Link to={records.length === 1 ? `/history/${first.id}` : '/history'} className="waiting-banner">
      <Clock3 size={18} aria-hidden="true" />
      <span className="num">{text}</span>
      <ChevronRight size={18} aria-hidden="true" />
    </Link>
  );
}
