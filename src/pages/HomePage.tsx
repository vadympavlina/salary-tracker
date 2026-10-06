import { CirclePlay, Plus, Settings, UsersRound, Wallet, WalletCards } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { calculateSalary, percentChange } from '../services/calculations/salaryCalculator';
import { shiftPeriod } from '../utils/period';
import { formatNumber, formatUAH } from '../utils/format';
import { Link } from '../router/router';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { SectionTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SalaryCard } from '../components/salary/SalaryCard';
import { MoneySummary } from '../components/salary/MoneySummary';
import { StatCard } from '../components/dashboard/StatCard';
import { HistoryItem } from '../components/history/HistoryItem';

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
          <MoneySummary calc={calc} />
          <div className="stats-row">
            <StatCard label="Пари" value={formatNumber(latest.pairs)} icon={<UsersRound size={18} />} />
            <StatCard label="Відео" value={formatNumber(latest.videos)} icon={<CirclePlay size={18} />} />
            <StatCard label="За відео" value={formatUAH(latest.videoRate)} icon={<Wallet size={18} />} />
          </div>
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
          <Button to="/calculate?new=1" icon={<Plus size={20} strokeWidth={2.4} />} block className="home-cta">
            Новий розрахунок
          </Button>
        </div>
      </div>
    </>
  );
}
