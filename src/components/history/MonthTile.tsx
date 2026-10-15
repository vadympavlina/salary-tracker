import { PencilLine, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SalaryRecord } from '../../types/salary';
import { calculateSalary } from '../../services/calculations/salaryCalculator';
import { formatMonth, formatPeriod } from '../../utils/period';
import { formatUAH } from '../../utils/format';
import { Link, useRouter } from '../../router/router';
import { useSalary } from '../../hooks/useSalaryStore';
import { useToast } from '../ui/Toast';
import { SwipeRow } from '../ui/SwipeRow';
import { STATUS_LABEL } from '../salary/PaymentStatus';

/**
 * One month as a tile: name, status dot, "на руки" and either the accrued total or what is still owed.
 * Swipe left for Змінити / Видалити (with undo).
 */
export function MonthTile({ record, current }: { record: SalaryRecord; current?: boolean }) {
  const calc = calculateSalary(record);
  const waiting = calc.remaining > 0;
  return (
    <li>
      <Swipeable record={record}>
        <Link to={`/history/${record.id}`} className={`history-item month-tile${current ? ' month-tile--current' : ''}${waiting ? ' month-tile--waiting' : ''}`}>
          <span className="month-tile__head">
            <span className="history-item__title month-tile__month">
              {formatMonth(record.period)}
              <span className="sr-only"> {record.period.slice(0, 4)}</span>
            </span>
            <span className={`month-tile__dot month-tile__dot--${calc.status}`} aria-hidden="true" />
          </span>
          <span className="month-tile__body">
            <span className="month-tile__amount num">
              <span className="sr-only">на руки </span>
              {formatUAH(calc.netIncome)}
            </span>
            <span className="month-tile__sub num">
              {waiting ? `ще ${formatUAH(calc.remaining)}` : `з ${formatUAH(calc.grossIncome)}`}
              <span className="sr-only">, {STATUS_LABEL[calc.status]}</span>
            </span>
          </span>
        </Link>
      </Swipeable>
    </li>
  );
}

/** Placeholder for the current month when it has no record yet. */
export function NewMonthTile({ period }: { period: string }) {
  return (
    <li>
      <Link to="/calculate?new=1" className="month-tile month-tile--new" aria-label={`Новий розрахунок: ${formatPeriod(period)}`}>
        <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
        {formatMonth(period)}
      </Link>
    </li>
  );
}

function Swipeable({ record, children }: { record: SalaryRecord; children: ReactNode }) {
  const { deleteRecord, restoreRecord, setDraft } = useSalary();
  const { navigate } = useRouter();
  const toast = useToast();
  const title = formatPeriod(record.period);
  return (
    <SwipeRow
      layout="column"
      fullSwipe={false}
      actions={[
        {
          label: 'Змінити',
          tone: 'grey',
          icon: <PencilLine size={18} />,
          onClick: () => {
            setDraft(null);
            navigate(`/calculate?edit=${record.id}`);
          },
        },
        {
          label: 'Видалити',
          tone: 'red',
          icon: <Trash2 size={18} />,
          onClick: async () => {
            const removed = await deleteRecord(record.id);
            if (removed) toast(`${title} видалено`, { tone: 'info', action: { label: 'Скасувати', onClick: () => restoreRecord(removed) } });
          },
        },
      ]}
    >
      {children}
    </SwipeRow>
  );
}
