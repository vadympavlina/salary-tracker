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
  /** dark: "premium card" with the payout split (home); default: purple card with progress. */
  variant?: 'accent' | 'dark';
}

/** Hero card: the one number that matters — "Сума на руки" — and how much of it has arrived. */
export function SalaryCard({ record, calc, change, to, variant = 'accent' }: Props) {
  const dark = variant === 'dark';
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
      {dark && (
        <dl className="hero__split">
          <div>
            <dt>Картка</dt>
            <dd className="num">{formatUAH(calc.received)}</dd>
          </div>
          <div>
            <dt>Аванс</dt>
            <dd className="num">{formatUAH(calc.advance)}</dd>
          </div>
          {calc.additional > 0 && (
            <div>
              <dt>Додатково</dt>
              <dd className="num">{formatUAH(calc.additional)}</dd>
            </div>
          )}
          {calc.remaining > 0 && (
            <div className="hero__split-left">
              <dt>Ще чекаю</dt>
              <dd className="num">{formatUAH(calc.remaining)}</dd>
            </div>
          )}
        </dl>
      )}
      {!dark && calc.netIncome > 0 && (
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
      <Link to={to} className={`hero hero--link${dark ? ' hero--dark' : ''}`}>
        {body}
      </Link>
    );
  }
  return <section className={`hero${dark ? ' hero--dark' : ''}`}>{body}</section>;
}
