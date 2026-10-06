import { Check, ChevronRight, CircleDashed, Clock3 } from 'lucide-react';
import type { SalaryRecord } from '../../types/salary';
import { calculateSalary } from '../../services/calculations/salaryCalculator';
import { formatPeriod } from '../../utils/period';
import { formatUAH } from '../../utils/format';
import { Link } from '../../router/router';
import { STATUS_LABEL } from '../salary/PaymentStatus';
import { Tile } from '../ui/List';

const STATUS_TILE = {
  paid: { color: 'green', Icon: Check },
  partial: { color: 'orange', Icon: CircleDashed },
  pending: { color: 'orange', Icon: Clock3 },
} as const;

export function HistoryItem({ record }: { record: SalaryRecord }) {
  const calc = calculateSalary(record);
  const { color, Icon } = STATUS_TILE[calc.status];
  return (
    <li>
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
    </li>
  );
}
