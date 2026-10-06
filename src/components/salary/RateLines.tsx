import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { NumberInput } from '../ui/fields';
import { formatNumber, formatUAH } from '../../utils/format';
import { toNumber } from '../../utils/input';

export interface LineForm {
  count: string;
  rate: string;
}

interface Props {
  legend: string;
  /** "Кількість пар" / "Перевірені відео" */
  countLabel: string;
  /** "Ставка за пару" / "Ставка за відео" */
  rateLabel: string;
  countIcon: ReactNode;
  rateIcon: ReactNode;
  lines: LineForm[];
  onChange: (lines: LineForm[]) => void;
  maxCount: number;
  maxRate: number;
  rateStep: number;
  defaultRate: number;
  /** Error under the first count field (e.g. "nothing entered"). */
  countError?: string;
  /** Show "rate missing" errors. */
  validate: boolean;
}

const MAX_LINES = 5;

/**
 * "count × rate" inputs with optional extra lines for a rate change mid-month.
 * The first line keeps the plain labels; extra lines are numbered.
 */
export function RateLines({ legend, countLabel, rateLabel, countIcon, rateIcon, lines, onChange, maxCount, maxRate, rateStep, defaultRate, countError, validate }: Props) {
  const update = (i: number, patch: Partial<LineForm>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(lines.filter((_, j) => j !== i));
  const add = () => onChange([...lines, { count: '', rate: lines[lines.length - 1]?.rate ?? String(defaultRate) }]);
  const total = lines.reduce((s, l) => s + toNumber(l.count) * toNumber(l.rate), 0);
  const multi = lines.length > 1;

  return (
    <fieldset className="group">
      <legend className="group__title">{legend}</legend>
      {lines.map((l, i) => {
        const n = i + 1;
        const rate = toNumber(l.rate);
        return (
          <div key={i} className={multi ? 'rate-line' : 'rate-line rate-line--single'}>
            {multi && (
              <div className="rate-line__head">
                <span>Ставка {n}</span>
                {i > 0 && (
                  <button type="button" className="rate-line__remove" aria-label={`Прибрати ставку ${n}: ${legend.toLowerCase()}`} onClick={() => remove(i)}>
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            <NumberInput
              label={i === 0 ? countLabel : `${countLabel} (ставка ${n})`}
              value={l.count}
              onChange={(v) => update(i, { count: v })}
              icon={countIcon}
              max={maxCount}
              error={i === 0 ? countError : undefined}
            />
            <NumberInput
              label={i === 0 ? rateLabel : `${rateLabel} ${n}`}
              value={l.rate}
              onChange={(v) => update(i, { rate: v })}
              icon={rateIcon}
              suffix="₴"
              step={rateStep}
              decimal
              max={maxRate}
              error={validate && toNumber(l.count) > 0 && rate <= 0 ? `Вкажи ${rateLabel.toLowerCase()}` : undefined}
              hint={i === 0 && rate !== defaultRate && defaultRate > 0 ? `За замовчуванням ${formatUAH(defaultRate)}` : undefined}
            />
          </div>
        );
      })}
      <div className="group__sum">
        <span className="num">
          {lines.map((l) => `${formatNumber(toNumber(l.count))} × ${formatUAH(toNumber(l.rate))}`).join(' + ')}
        </span>
        <b className="num">{formatUAH(total)}</b>
      </div>
      {lines.length < MAX_LINES && (
        <button type="button" className="add-line" onClick={add} aria-label={`Інша ставка: ${legend.toLowerCase()}`}>
          <Plus size={16} aria-hidden="true" />
          Інша ставка
        </button>
      )}
    </fieldset>
  );
}

export const linesToForm = (lines: { count: number; rate: number }[]) =>
  lines.length ? lines.map((l) => ({ count: l.count ? String(l.count) : '', rate: l.rate ? String(l.rate) : '' })) : [{ count: '', rate: '' }];

/** Drops empty extra lines; always keeps at least one. */
export const formToLines = (lines: LineForm[]) => {
  const parsed = lines.map((l) => ({ count: toNumber(l.count), rate: toNumber(l.rate) }));
  const kept = parsed.filter((l, i) => i === 0 || l.count > 0);
  return kept.length ? kept : [{ count: 0, rate: 0 }];
};
