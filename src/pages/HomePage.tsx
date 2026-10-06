import { Plus, WalletCards } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { calculateSalary, percentChange } from '../services/calculations/salaryCalculator';
import { formatMonthShort, formatPeriod, shiftPeriod } from '../utils/period';
import { formatCompact, formatUAH } from '../utils/format';
import { Link } from '../router/router';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { Group } from '../components/ui/List';
import { EmptyState } from '../components/ui/EmptyState';
import { SalaryCard } from '../components/salary/SalaryCard';
import { MonthCounter } from '../components/dashboard/MonthCounter';
import { HistoryItem } from '../components/history/HistoryItem';
import { ChartCard } from '../components/analytics/ChartCard';
import { BarChart } from '../components/analytics/BarChart';
import { buildMonthlySeries } from '../services/calculations/analytics';

const today = () => new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

export function HomePage() {
  const { records, profile, findByPeriod } = useSalary();
  const latest = records[0];

  const header = (
    <PageHeader
      eyebrow={today()}
      title={`Привіт, ${profile.firstName}`}
      actions={
        <IconButton label="Новий розрахунок" to="/calculate?new=1" tone="accent">
          <Plus size={22} strokeWidth={2.6} />
        </IconButton>
      }
    />
  );

  if (!latest) {
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

  const calc = calculateSalary(latest);
  const prev = findByPeriod(shiftPeriod(latest.period, -1));
  const change = percentChange(calc.grossIncome, prev ? calculateSalary(prev).grossIncome : undefined);

  return (
    <>
      {header}
      <div className="dashboard">
        <div className="dashboard__main stack">
          <SalaryCard record={latest} calc={calc} change={change} to={`/history/${latest.id}`} />
          <MonthCounter />
          {records.length > 1 && (
            <div className="desktop-only">
              <ChartCard title="Динаміка доходу" subtitle="Нараховано за останні місяці" action={<Link to="/analytics" className="link">Аналітика</Link>}>
                <BarChart
                  data={buildMonthlySeries(records, 6).map((p) => ({ key: p.period, label: formatMonthShort(p.period), title: formatPeriod(p.period), value: p.gross }))}
                  format={formatUAH}
                  axisFormat={formatCompact}
                  ariaLabel="Нараховано по місяцях"
                  height={150}
                />
              </ChartCard>
            </div>
          )}
        </div>
        <div className="dashboard__side stack">
          <Group title="Останні" id="recent" list action={<Link to="/history" className="link">Усі</Link>}>
            {records.slice(0, 4).map((r) => (
              <HistoryItem key={r.id} record={r} />
            ))}
          </Group>
        </div>
      </div>
    </>
  );
}
