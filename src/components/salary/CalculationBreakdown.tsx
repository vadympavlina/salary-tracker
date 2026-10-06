import type { ReactNode } from 'react';
import type { RateLine, SalaryCalculation, SalaryInput } from '../../types/salary';
import { formatNumber, formatUAH } from '../../utils/format';

interface RowProps {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  tone?: 'green' | 'red' | 'orange' | 'muted';
  sub?: ReactNode;
}

function Row({ label, value, strong, tone, sub }: RowProps) {
  return (
    <div className={`bd-row${strong ? ' bd-row--strong' : ''}`}>
      <dt>
        {label}
        {sub && <small>{sub}</small>}
      </dt>
      <dd className={`num${tone ? ` tone-${tone}` : ''}`}>{value}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bd-group">
      <h3 className="bd-group__title">{title}</h3>
      <dl>{children}</dl>
    </section>
  );
}

/** One rate: "Пари 12 / Ставка 350 ₴". Several rates: one "12 × 350 ₴ = 4 200 ₴" row each. */
function Lines({ lines, countLabel, rateLabel }: { lines: RateLine[]; countLabel: string; rateLabel: string }) {
  if (lines.length <= 1) {
    const l = lines[0] ?? { count: 0, rate: 0 };
    return (
      <>
        <Row label={countLabel} value={formatNumber(l.count)} />
        <Row label={rateLabel} value={formatUAH(l.rate)} />
      </>
    );
  }
  return (
    <>
      {lines.map((l, i) => (
        <Row key={i} label={`${formatNumber(l.count)} × ${formatUAH(l.rate)}`} value={formatUAH(l.count * l.rate)} />
      ))}
      <Row label={`${countLabel} разом`} value={formatNumber(lines.reduce((s, l) => s + l.count, 0))} />
    </>
  );
}

/** Full, human-readable breakdown of a calculation. */
export function CalculationBreakdown({ input, calc }: { input: SalaryInput; calc: SalaryCalculation }) {
  const extra = input.advanceMode === 'extra';
  return (
    <div className="breakdown">
      <Group title="Основна частина">
        <Lines lines={input.pairItems} countLabel="Пари" rateLabel="Ставка за пару" />
        <Row label="Сума за пари" value={formatUAH(calc.pairIncome)} strong />
      </Group>

      <Group title="Перевірені відео">
        <Lines lines={input.videoItems} countLabel="Відео" rateLabel="Ставка за відео" />
        <Row label="Сума за відео" value={formatUAH(calc.videoIncome)} strong />
      </Group>

      <Group title="Додаткові виплати">
        <Row label="Аванс" sub={extra ? 'додатковий дохід' : 'частина зарплати'} value={formatUAH(calc.advance)} />
        <Row label="Додаткові" value={formatUAH(calc.additional)} tone={calc.additional > 0 ? 'green' : undefined} />
      </Group>

      <Group title="Загальна сума">
        <Row label="Всього нараховано" value={formatUAH(calc.grossIncome)} strong />
      </Group>

      <Group title="Виплата">
        <Row label="Аванс" value={formatUAH(-calc.advance)} tone={calc.advance > 0 ? 'muted' : undefined} />
        <Row label="Прийшло на картку" value={formatUAH(-calc.received)} tone={calc.received > 0 ? 'muted' : undefined} />
        <div className="bd-total">
          <dt>
            Сума на руки
            <small>нараховано − аванс − картка</small>
          </dt>
          <dd className="num">{formatUAH(calc.netIncome)}</dd>
        </div>
        <Row label="Отримано на руки" value={formatUAH(calc.cashReceived)} tone={calc.cashReceived > 0 ? 'green' : undefined} />
        <Row label="Залишилось отримати" value={formatUAH(calc.remaining)} strong tone={calc.remaining > 0 ? 'orange' : 'green'} />
      </Group>
    </div>
  );
}
