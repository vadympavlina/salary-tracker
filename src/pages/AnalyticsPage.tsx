import { useMemo, useState } from 'react';
import { ChartColumn, Plus } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { buildMonthlySeries, incomeStructure, seriesStats, type MonthPoint } from '../services/calculations/analytics';
import { percentChange } from '../services/calculations/salaryCalculator';
import { formatCompact, formatNumber, formatUAH, plural } from '../utils/format';
import { formatMonthShort, formatPeriod } from '../utils/period';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ChartCard } from '../components/analytics/ChartCard';
import { BarChart, type BarDatum } from '../components/analytics/BarChart';
import { DonutChart } from '../components/analytics/DonutChart';
import { StatCard } from '../components/dashboard/StatCard';
import { ChangeBadge } from '../components/salary/ChangeBadge';

type Tab = 'income' | 'pairs' | 'videos';
type Range = '6' | '12' | 'all';

const toBars = (points: MonthPoint[], pick: (p: MonthPoint) => number): BarDatum[] =>
  points.map((p) => ({ key: p.period, label: formatMonthShort(p.period), title: formatPeriod(p.period), value: pick(p) }));

export function AnalyticsPage() {
  const { records } = useSalary();
  const [tab, setTab] = useState<Tab>('income');
  const [range, setRange] = useState<Range>('6');

  const points = useMemo(() => buildMonthlySeries(records, range === 'all' ? Infinity : Number(range)), [records, range]);

  if (records.length === 0) {
    return (
      <>
        <PageHeader title="Аналітика" />
        <EmptyState
          icon={<ChartColumn size={30} />}
          title="Ще немає даних"
          text="Збережи хоча б один розрахунок — і тут з’являться графіки та статистика."
          action={
            <Button to="/calculate?new=1" icon={<Plus size={20} />}>
              Новий розрахунок
            </Button>
          }
        />
      </>
    );
  }

  const last = points[points.length - 1];
  const prevPoint = points[points.length - 2];
  const rangeLabel = `${points.length} ${plural(points.length, ['місяць', 'місяці', 'місяців'])}`;

  return (
    <>
      <PageHeader title="Аналітика" subtitle={`За ${rangeLabel}`} />
      <div className="toolbar toolbar--split">
        <Segmented
          label="Розділ аналітики"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'income', label: 'Доходи' },
            { value: 'pairs', label: 'Пари' },
            { value: 'videos', label: 'Відео' },
          ]}
        />
        <Segmented
          label="Період"
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: '6', label: '6 міс' },
            { value: '12', label: '12 міс' },
            { value: 'all', label: 'Усе' },
          ]}
        />
      </div>

      <div key={tab} className="analytics fade-in">
        {tab === 'income' && <IncomeTab points={points} last={last} prev={prevPoint} />}
        {tab === 'pairs' && <CountTab points={points} kind="pairs" />}
        {tab === 'videos' && <CountTab points={points} kind="videos" />}
      </div>
    </>
  );
}

function IncomeTab({ points, last, prev }: { points: MonthPoint[]; last: MonthPoint; prev?: MonthPoint }) {
  const stats = seriesStats(points, (p) => p.gross);
  const hand = seriesStats(points, (p) => p.net);
  const structure = incomeStructure(points);
  return (
    <>
      <ChartCard title="Динаміка доходу" subtitle="Всього нараховано за місяць">
        <BarChart data={toBars(points, (p) => p.gross)} format={formatUAH} axisFormat={formatCompact} ariaLabel="Нараховано по місяцях" />
      </ChartCard>
      <div className="stats-grid">
        <StatCard label="Середня сума" value={formatUAH(Math.round(stats.average))} hint="нараховано за місяць" />
        <StatCard label="Найбільша сума" value={formatUAH(stats.max)} hint={stats.maxPeriod ? formatPeriod(stats.maxPeriod) : undefined} />
        <StatCard label="Останній місяць" value={formatUAH(last.gross)} hint={<ChangeBadge value={percentChange(last.gross, prev?.gross)} />} />
        <StatCard label="Разом за період" value={formatUAH(stats.total)} hint={`на руки ${formatUAH(hand.total)}`} />
      </div>
      {structure.length > 0 && (
        <ChartCard title="Структура доходу" subtitle="Звідки гроші за обраний період">
          <DonutChart slices={structure} />
        </ChartCard>
      )}
    </>
  );
}

function CountTab({ points, kind }: { points: MonthPoint[]; kind: 'pairs' | 'videos' }) {
  const isPairs = kind === 'pairs';
  const pick = (p: MonthPoint) => (isPairs ? p.pairs : p.videos);
  const pickIncome = (p: MonthPoint) => (isPairs ? p.pairIncome : p.videoIncome);
  const stats = seriesStats(points, pick);
  const income = seriesStats(points, pickIncome);
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const unit = (n: number) => `${formatNumber(n)} ${plural(Math.round(n), isPairs ? ['пара', 'пари', 'пар'] : ['відео', 'відео', 'відео'])}`;

  return (
    <>
      <ChartCard title={isPairs ? 'Кількість пар' : 'Перевірені відео'} subtitle="По місяцях">
        <BarChart
          data={toBars(points, pick)}
          format={unit}
          axisFormat={(n) => (n >= 1000 ? formatCompact(n) : String(Math.round(n)))}
          ariaLabel={isPairs ? 'Кількість пар по місяцях' : 'Кількість відео по місяцях'}
        />
      </ChartCard>
      <div className="stats-grid">
        <StatCard label="Останній місяць" value={unit(pick(last))} hint={<ChangeBadge value={percentChange(pick(last), prev ? pick(prev) : undefined)} />} />
        <StatCard label="В середньому" value={formatNumber(Math.round(stats.average * 10) / 10, true)} hint="за місяць" />
        <StatCard label="Максимум" value={formatNumber(stats.max)} hint={stats.maxPeriod ? formatPeriod(stats.maxPeriod) : undefined} />
        <StatCard label={isPairs ? 'Дохід від пар' : 'Дохід від відео'} value={formatUAH(pickIncome(last))} hint={`${formatUAH(income.total)} за період`} />
      </div>
      <ChartCard title={isPairs ? 'Дохід від пар' : 'Дохід від відео'} subtitle="По місяцях">
        <BarChart data={toBars(points, pickIncome)} format={formatUAH} axisFormat={formatCompact} ariaLabel="Дохід по місяцях" height={160} />
      </ChartCard>
    </>
  );
}
