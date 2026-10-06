import type { ReactNode } from 'react';
import type { SalaryCalculation, SalaryInput } from '../../types/salary';
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

/** Full, human-readable breakdown of a calculation. */
export function CalculationBreakdown({ input, calc }: { input: SalaryInput; calc: SalaryCalculation }) {
  const extra = input.advanceMode === 'extra';
  return (
    <div className="breakdown">
      <Group title="Основна частина">
        <Row label="Пари" value={formatNumber(input.pairs)} />
        <Row label="Ставка за пару" value={formatUAH(input.pairRate)} />
        <Row label="Сума за пари" value={formatUAH(calc.pairIncome)} strong />
      </Group>

      <Group title="Перевірені відео">
        <Row label="Відео" value={formatNumber(input.videos)} />
        <Row label="Ставка за відео" value={formatUAH(input.videoRate)} />
        <Row label="Сума за відео" value={formatUAH(calc.videoIncome)} strong />
      </Group>

      <Group title="Додаткові виплати">
        <Row label="Аванс" sub={extra ? 'додатковий дохід' : 'частина зарплати'} value={formatUAH(calc.advance)} />
        <Row label="Додаткові" value={formatUAH(calc.additional)} tone={calc.additional > 0 ? 'green' : undefined} />
      </Group>

      <Group title="Загальна сума">
        <Row label="Всього нараховано" value={formatUAH(calc.grossIncome)} strong />
        {input.taxRate > 0 && (
          <Row label={`Податки (${formatNumber(input.taxRate, true)}%)`} sub="вже утримано, довідково" value={`≈ ${formatUAH(calc.taxEstimate)}`} tone="muted" />
        )}
        <div className="bd-total">
          <dt>Сума на руки</dt>
          <dd className="num">{formatUAH(calc.netIncome)}</dd>
        </div>
      </Group>

      <Group title="Виплата">
        {calc.advance > 0 && <Row label="Аванс отримано" value={formatUAH(calc.advance)} />}
        <Row label="Має прийти на картку" value={formatUAH(calc.expectedOnCard)} />
        <Row label="Прийшло на картку" value={formatUAH(calc.received)} />
        {calc.received > 0 && calc.cardDifference !== 0 && (
          <Row label="Різниця" value={formatUAH(calc.cardDifference, { sign: true })} tone={calc.cardDifference > 0 ? 'green' : 'red'} />
        )}
        <Row
          label="Залишилось отримати"
          value={formatUAH(calc.remaining)}
          strong
          tone={calc.remaining > 0 ? 'orange' : 'green'}
        />
      </Group>
    </div>
  );
}
