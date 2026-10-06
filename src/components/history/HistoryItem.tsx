import { Check, ChevronRight, CircleDashed, Clock3, PencilLine, Trash2 } from 'lucide-react';
import type { SalaryRecord } from '../../types/salary';
import { calculateSalary } from '../../services/calculations/salaryCalculator';
import { formatPeriod } from '../../utils/period';
import { formatUAH } from '../../utils/format';
import { Link, useRouter } from '../../router/router';
import { useSalary } from '../../hooks/useSalaryStore';
import { useToast } from '../ui/Toast';
import { SwipeRow } from '../ui/SwipeRow';
import { STATUS_LABEL } from '../salary/PaymentStatus';
import { Tile } from '../ui/List';

const STATUS_TILE = {
  paid: { color: 'green', Icon: Check },
  partial: { color: 'orange', Icon: CircleDashed },
  pending: { color: 'orange', Icon: Clock3 },
} as const;

/** A month in a list. `swipeable`: drag left for "Змінити" / "Видалити" (with undo). */
export function HistoryItem({ record, swipeable }: { record: SalaryRecord; swipeable?: boolean }) {
  const calc = calculateSalary(record);
  const { color, Icon } = STATUS_TILE[calc.status];
  const link = (
    <Link to={`/history/${record.id}`} className="history-item">
      <Tile color={color}>
        <Icon size={17} strokeWidth={2.6} />
      </Tile>
      <span className="history-item__main">
        <span className="history-item__title">{formatPeriod(record.period)}</span>
        <span className={`history-item__status history-item__status--${calc.status}`}>
          {STATUS_LABEL[calc.status]}
          {calc.status !== 'paid' && calc.remaining > 0 && <span className="num"> · ще {formatUAH(calc.remaining)}</span>}
        </span>
      </span>
      <span className="history-item__side">
        <span className="history-item__amount num">
          <span className="sr-only">на руки </span>
          {formatUAH(calc.netIncome)}
        </span>
        <span className="history-item__gross num">
          з <span className="sr-only">нарахованих </span>
          {formatUAH(calc.grossIncome)}
        </span>
      </span>
      <ChevronRight className="row__chevron" size={18} strokeWidth={2.4} aria-hidden="true" />
    </Link>
  );
  return <li>{swipeable ? <Swipeable record={record}>{link}</Swipeable> : link}</li>;
}

function Swipeable({ record, children }: { record: SalaryRecord; children: React.ReactNode }) {
  const { deleteRecord, restoreRecord, setDraft } = useSalary();
  const { navigate } = useRouter();
  const toast = useToast();
  const title = formatPeriod(record.period);
  return (
    <SwipeRow
      actions={[
        {
          label: 'Змінити',
          tone: 'grey',
          icon: <PencilLine size={20} />,
          onClick: () => {
            setDraft(null);
            navigate(`/calculate?edit=${record.id}`);
          },
        },
        {
          label: 'Видалити',
          tone: 'red',
          icon: <Trash2 size={20} />,
          onClick: async () => {
            const removed = await deleteRecord(record.id);
            if (removed)
              toast(`${title} видалено`, {
                tone: 'info',
                action: {
                  label: 'Скасувати',
                  onClick: () => restoreRecord(removed),
                },
              });
          },
        },
      ]}
    >
      {children}
    </SwipeRow>
  );
}
