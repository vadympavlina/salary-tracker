import type { SalaryCalculation, SalaryRecord, SalaryInput } from '../../types/salary';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { ChangeBadge } from './ChangeBadge';
import { PaymentStatus } from './PaymentStatus';
import { formatPeriod } from '../../utils/period';
import { formatUAH } from '../../utils/format';
import { Link } from '../../router/router';
import { ChevronRight, Coins, CreditCard } from 'lucide-react';

interface Props {
  record: SalaryRecord | SalaryInput;
  calc: SalaryCalculation;
  change: number | null;
  to?: string;
}

/** Hero card: the one number that matters — "Сума на руки". */
export function SalaryCard({ record, calc, change, to }: Props) {
  const body = (
    <>
      <span className="hero__glow" aria-hidden="true" />
      <div className="hero__top">
        <span className="hero__label">На руки · {formatPeriod(record.period)}</span>
        <PaymentStatus status={calc.status} onDark />
      </div>
      <AnimatedNumber value={calc.netIncome} className="hero__amount" />
      <div className="hero__bottom">
        <span className="hero__meta">
          <Coins size={16} aria-hidden="true" />
          Нараховано <b className="num">{formatUAH(calc.grossIncome)}</b>
          <ChangeBadge value={change} onDark />
        </span>
        <span className="hero__meta">
          <CreditCard size={16} aria-hidden="true" />
          На картці <b className="num">{formatUAH(calc.received)}</b>
          {calc.advance > 0 && (
            <>
              {' '}· аванс <b className="num">{formatUAH(calc.advance)}</b>
            </>
          )}
        </span>
      </div>
      {to && <ChevronRight className="hero__chevron" size={20} aria-hidden="true" />}
    </>
  );
  if (to) {
    return (
      <Link to={to} className="hero hero--link" aria-label={`Деталі: ${formatPeriod(record.period)}, на руки ${formatUAH(calc.netIncome)}`}>
        {body}
      </Link>
    );
  }
  return <section className="hero">{body}</section>;
}
