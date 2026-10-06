import { CirclePlay, Plus, Settings, UsersRound, Wallet, WalletCards } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { calculateSalary, percentChange } from '../services/calculations/salaryCalculator';
import { currentPeriod, formatMonthShort, formatPeriod, shiftPeriod } from '../utils/period';
import { formatCompact, formatNumber, formatUAH } from '../utils/format';
import { Link } from '../router/router';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { SectionTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SalaryCard } from '../components/salary/SalaryCard';
import { MoneySummary } from '../components/salary/MoneySummary';
import { StatCard } from '../components/dashboard/StatCard';
import { MonthCounter } from '../components/dashboard/MonthCounter';
import { HistoryItem } from '../components/history/HistoryItem';
import { ChartCard } from '../components/analytics/ChartCard';
import { BarChart } from '../components/analytics/BarChart';
import { buildMonthlySeries } from '../services/calculations/analytics';

export function HomePage() {
  const { records, profile, findByPeriod } = useSalary();
  const latest = records[0];

  const header = (
    <PageHeader
      title={
        <>
          Привіт, {profile.firstName} <span aria-hidden="true">👋</span>
        </>
      }
      subtitle={latest ? 'Ось твій розрахунок за цей період' : 'Почнімо з першого розрахунку'}
      actions={
        <IconButton label="Налаштування" to="/settings" className="only-mobile">
          <Settings size={20} />
        </IconButton>
      }
    />
  );

  if (!latest) {
    return (
      <>
        {header}
        <MonthCounter />
        <EmptyState
          icon={<WalletCards size={30} />}
          title="Поки що немає розрахунків"
          text="Створи свій перший розрахунок зарплати."
          action={
            <Button to="/calculate?new=1" icon={<Plus size={20} />}>
              Новий розрахунок
            </Button>
          }
        />
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
          <MoneySummary calc={calc} />
          {/* The counter already shows this month's pairs/videos — only repeat them for a past month. */}
          {latest.period !== currentPeriod() && (
            <div className="stats-row">
              <StatCard label="Пари" value={formatNumber(calc.pairs)} icon={<UsersRound size={18} />} />
              <StatCard label="Відео" value={formatNumber(calc.videos)} icon={<CirclePlay size={18} />} />
              <StatCard label="За відео" value={formatUAH(latest.videoItems[latest.videoItems.length - 1]?.rate ?? 0)} icon={<Wallet size={18} />} />
            </div>
          )}
        </div>
        <div className="dashboard__side stack">
          <section>
            <SectionTitle action={<Link to="/history" className="link">Дивитись усе</Link>}>Останні нарахування</SectionTitle>
            <ul className="list-card">
              {records.slice(0, 3).map((r) => (
                <HistoryItem key={r.id} record={r} />
              ))}
            </ul>
          </section>
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
          <Button to="/calculate?new=1" icon={<Plus size={20} strokeWidth={2.4} />} block className="home-cta">
            Новий розрахунок
          </Button>
        </div>
      </div>
    </>
  );
}
