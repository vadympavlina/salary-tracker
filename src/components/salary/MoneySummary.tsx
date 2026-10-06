import type { CSSProperties } from 'react';
import type { SalaryCalculation } from '../../types/salary';
import { formatUAH } from '../../utils/format';
import { CheckCircle2 } from 'lucide-react';

/** The three questions: how much did I earn, receive, and what's left. */
export function MoneySummary({ calc }: { calc: SalaryCalculation }) {
  const progress = calc.grossIncome > 0 ? Math.min(1, calc.totalReceived / calc.grossIncome) : 1;
  const done = calc.remaining <= 0;
  return (
    <section className="money card" aria-label="Підсумок виплат">
      <dl className="money__grid">
        <div className="money__cell">
          <dt>Заробив</dt>
          <dd className="num">{formatUAH(calc.grossIncome)}</dd>
        </div>
        <div className="money__cell">
          <dt>Отримав</dt>
          <dd className="num money__received">{formatUAH(calc.totalReceived)}</dd>
        </div>
        <div className="money__cell">
          <dt>Залишилось</dt>
          <dd className={`num ${done ? 'money__done' : 'money__left'}`}>{formatUAH(calc.remaining)}</dd>
        </div>
      </dl>
      <div
        className="money__bar"
        role="progressbar"
        aria-label="Отримано від нарахованого"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        style={{ '--p': progress } as CSSProperties}
      >
        <span />
      </div>
      <p className="money__caption">
        {done ? (
          <>
            <CheckCircle2 size={15} aria-hidden="true" /> Усе отримано
          </>
        ) : (
          <>
            Отримано {Math.round(progress * 100)}% · ще {formatUAH(calc.remaining)} на руки
          </>
        )}
      </p>
    </section>
  );
}
