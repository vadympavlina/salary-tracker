import type { ReactNode } from 'react';
import type { RateLine, SalaryCalculation, SalaryInput } from '../../types/salary';
import { formatNumber, formatUAH, plural } from '../../utils/format';
import { Group, Row } from '../ui/List';

type Tone = 'green' | 'orange' | 'muted' | 'accent';

const money = (v: ReactNode, tone?: Tone) => <span className={tone ? `tone-${tone}` : undefined}>{v}</span>;

/** One rate: "Пари · 12 × 350 ₴ … 4 200 ₴". Several rates: a row per rate plus a total row. */
function Lines({ lines, title, total, forms }: { lines: RateLine[]; title: string; total: number; forms: [string, string, string] }) {
  if (lines.length <= 1) {
    const l = lines[0] ?? { count: 0, rate: 0 };
    return <Row className="bd-row" title={title} subtitle={`${formatNumber(l.count)} × ${formatUAH(l.rate)}`} value={formatUAH(total)} />;
  }
  const count = lines.reduce((s, l) => s + l.count, 0);
  return (
    <>
      {lines.map((l, i) => (
        <Row key={i} className="bd-row bd-row--sub" title={`${formatNumber(l.count)} × ${formatUAH(l.rate)}`} value={formatUAH(l.count * l.rate)} />
      ))}
      <Row className="bd-row" title={`${title} разом`} subtitle={`${formatNumber(count)} ${plural(count, forms)}`} value={formatUAH(total)} />
    </>
  );
}

/** Full, human-readable breakdown: what was accrued, then how it was paid out. */
export function CalculationBreakdown({ input, calc, footer }: { input: SalaryInput; calc: SalaryCalculation; footer?: ReactNode }) {
  const extra = input.advanceMode === 'extra';
  return (
    <div className="breakdown">
      <Group title="Нараховано" id="bd-gross">
        <Lines lines={input.pairItems} title="Пари" total={calc.pairIncome} forms={['пара', 'пари', 'пар']} />
        <Lines lines={input.videoItems} title="Відео" total={calc.videoIncome} forms={['відео', 'відео', 'відео']} />
        {calc.additional > 0 && <Row className="bd-row" title="Додаткові" subtitle="премії, доплати" value={money(formatUAH(calc.additional), 'green')} />}
        {extra && calc.advance > 0 && <Row className="bd-row" title="Аванс" subtitle="додатковий дохід" value={money(formatUAH(calc.advance), 'green')} />}
        <Row className="bd-row" title="Всього нараховано" value={formatUAH(calc.grossIncome)} strong />
      </Group>

      <Group title="Виплата" id="bd-pay" footer={footer}>
        <Row className="bd-row" title="Аванс" value={money(formatUAH(-calc.advance), calc.advance > 0 ? 'muted' : undefined)} />
        <Row className="bd-row" title="Прийшло на картку" value={money(formatUAH(-calc.received), calc.received > 0 ? 'muted' : undefined)} />
        <Row className="bd-row bd-total" title="Сума на руки" subtitle="нараховано − аванс − картка" value={formatUAH(calc.netIncome)} strong />
        <Row className="bd-row" title="Отримано на руки" value={money(formatUAH(calc.cashReceived), calc.cashReceived > 0 ? 'green' : undefined)} />
        <Row className="bd-row" title="Залишилось отримати" value={money(formatUAH(calc.remaining), calc.remaining > 0 ? 'orange' : 'green')} strong />
      </Group>
    </div>
  );
}
