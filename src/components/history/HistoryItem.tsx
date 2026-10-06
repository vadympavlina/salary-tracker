import { CalendarDays, ChevronRight } from 'lucide-react';
import type { SalaryRecord } from '../../types/salary';
import { calculateSalary } from '../../services/calculations/salaryCalculator';
import { formatPeriod, formatPeriodDate } from '../../utils/period';
import { formatUAH } from '../../utils/format';
import { Link } from '../../router/router';
import { PaymentStatus } from '../salary/PaymentStatus';

export function HistoryItem({ record }: { record: SalaryRecord }) {
  const calc = calculateSalary(record);
  return (
    <li>
      <Link to={`/history/${record.id}`} className="history-item">
        <span className={`history-item__icon history-item__icon--${calc.status}`} aria-hidden="true">
          <CalendarDays size={20} />
        </span>
        <span className="history-item__main">
          <span className="history-item__title">
            {formatPeriod(record.period)}
          </span>
          <span className="history-item__date num">
            {formatPeriodDate(record.period)}
            {record.isDemo && <span className="tag">демо</span>}
          </span>
        </span>
        <span className="history-item__side">
          <span className="history-item__amount num">{formatUAH(calc.netIncome)}</span>
          <PaymentStatus status={calc.status} />
        </span>
        <ChevronRight className="history-item__chevron" size={18} aria-hidden="true" />
      </Link>
    </li>
  );
}
