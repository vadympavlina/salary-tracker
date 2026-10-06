import { useMemo, useState } from 'react';
import { Plus, Layers, SearchX } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { calculateSalary } from '../services/calculations/salaryCalculator';
import { formatUAH, plural } from '../utils/format';
import { PageHeader } from '../components/ui/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/ui/EmptyState';
import { HistoryItem } from '../components/history/HistoryItem';
import { Group } from '../components/ui/List';

type Filter = 'all' | 'paid' | 'waiting';

export function HistoryPage() {
  const { records } = useSalary();
  const [filter, setFilter] = useState<Filter>(() => (sessionStorage.getItem('history_filter') as Filter) || 'all');

  const withStatus = useMemo(() => records.map((r) => ({ r, c: calculateSalary(r) })), [records]);
  const counts = {
    all: withStatus.length,
    paid: withStatus.filter((x) => x.c.status === 'paid').length,
    waiting: withStatus.filter((x) => x.c.status !== 'paid').length,
  };
  const visible = withStatus.filter((x) => filter === 'all' || (filter === 'paid' ? x.c.status === 'paid' : x.c.status !== 'paid'));
  const owed = withStatus.reduce((s, x) => s + x.c.remaining, 0);

  // Group by year for long histories.
  const groups = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const x of visible) {
      const y = x.r.period.slice(0, 4);
      map.set(y, [...(map.get(y) ?? []), x]);
    }
    return [...map.entries()];
  }, [visible]);

  const changeFilter = (f: Filter) => {
    setFilter(f);
    try {
      sessionStorage.setItem('history_filter', f);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <PageHeader
        title="Історія"
        subtitle={
          records.length
            ? `${records.length} ${plural(records.length, ['розрахунок', 'розрахунки', 'розрахунків'])}${owed > 0 ? ` · очікується ${formatUAH(owed)}` : ''}`
            : undefined
        }
        actions={
          <IconButton label="Новий розрахунок" to="/calculate?new=1" tone="accent">
            <Plus size={22} strokeWidth={2.6} />
          </IconButton>
        }
      />

      {records.length === 0 ? (
        <EmptyState
          icon={<Layers size={30} />}
          title="Поки що немає розрахунків"
          text="Створи свій перший розрахунок зарплати."
          action={
            <Button to="/calculate?new=1" icon={<Plus size={20} />}>
              Новий розрахунок
            </Button>
          }
        />
      ) : (
        <>
          <div className="toolbar">
            <Segmented
              label="Фільтр за статусом"
              value={filter}
              onChange={changeFilter}
              options={[
                { value: 'all', label: 'Всі', badge: counts.all },
                { value: 'paid', label: 'Виплачено', badge: counts.paid },
                { value: 'waiting', label: 'В очікуванні', badge: counts.waiting },
              ]}
            />
          </div>
          {visible.length === 0 ? (
            <EmptyState
              icon={<SearchX size={30} />}
              title={filter === 'paid' ? 'Немає виплачених' : 'Усе виплачено'}
              text={filter === 'paid' ? 'Тут з’являться повністю виплачені місяці.' : 'Немає місяців, що очікують на виплату.'}
            />
          ) : (
            groups.map(([year, items]) => (
              <Group
                key={year}
                id={`year-${year}`}
                className="history-group"
                list
                title={year}
                action={
                  <span className="group-list__meta num">
                    на руки {formatUAH(items.reduce((s, x) => s + x.c.netIncome, 0))}
                  </span>
                }
              >
                {items.map(({ r }) => (
                  <HistoryItem key={r.id} record={r} />
                ))}
              </Group>
            ))
          )}
        </>
      )}
    </>
  );
}
