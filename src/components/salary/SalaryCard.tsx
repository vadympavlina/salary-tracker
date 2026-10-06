import type { CSSProperties } from 'react';
import type { SalaryCalculation, SalaryRecord, SalaryInput } from '../../types/salary';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { ChangeBadge } from './ChangeBadge';
import { PaymentStatus } from './PaymentStatus';
import { formatPeriod } from '../../utils/period';
import { formatUAH } from '../../utils/format';
import { Link } from '../../router/router';
import { ChevronRight } from 'lucide-react';

interface Props {
  record: SalaryRecord | SalaryInput;
  calc: SalaryCalculation;
  change: number | null;
  to?: string;
}

/** Hero card: the one number that matters — "Сума на руки" — and how much of it has arrived. */
export function SalaryCard({ record, calc, change, to }: Props) {
  const progress = calc.netIncome > 0 ? Math.min(1, calc.cashReceived / calc.netIncome) : 1;
  const done = calc.remaining <= 0;
  const body = (
    <>
      <span className="hero__glow" aria-hidden="true" />
      <div className="hero__top">
        <span className="hero__label">На руки · {formatPeriod(record.period)}</span>
        <PaymentStatus status={calc.status} onDark />
      </div>
      <AnimatedNumber value={calc.netIncome} className="hero__amount" />
      <p className="hero__meta">
        з <b className="num">{formatUAH(calc.grossIncome)}</b> нараховано
        <ChangeBadge value={change} onDark />
      </p>
      {calc.netIncome > 0 && (
        <div className="hero__progress">
          <div
            className="hero__bar"
            role="progressbar"
            aria-label="Отримано на руки"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            style={{ '--p': progress } as CSSProperties}
          >
            <span />
          </div>
          <p className="hero__caption num">
            {done ? (
              'Усе отримано'
            ) : (
              <>
                Отримано {formatUAH(calc.cashReceived)} · ще <b>{formatUAH(calc.remaining)}</b>
              </>
            )}
          </p>
        </div>
      )}
      {to && <ChevronRight className="hero__chevron" size={20} aria-hidden="true" />}
    </>
  );
  if (to) {
    return (
      <Link to={to} className="hero hero--link">
        {body}
      </Link>
    );
  }
  return <section className="hero">{body}</section>;
}
