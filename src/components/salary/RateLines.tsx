import { useId } from 'react';
import { MessageSquareText, Plus, X } from 'lucide-react';
import { NumberInput } from '../ui/fields';
import { formatNumber, formatUAH } from '../../utils/format';
import { toNumber } from '../../utils/input';
import type { RateLine } from '../../types/salary';
import { LINE_NOTE_MAX } from '../../services/storage/salaryStorage';

export interface LineForm {
  count: string;
  rate: string;
  note: string;
}

interface Props {
  legend: string;
  /** "Кількість пар" / "Перевірені відео" */
  countLabel: string;
  /** "Ставка за пару" / "Ставка за відео" */
  rateLabel: string;
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
 * "count × rate" cells in one grouped section, with optional extra lines for a rate change mid-month.
 * The first line keeps the plain labels; extra lines are numbered.
 */
export function RateLines({ legend, countLabel, rateLabel, lines, onChange, maxCount, maxRate, rateStep, defaultRate, countError, validate }: Props) {
  const update = (i: number, patch: Partial<LineForm>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(lines.filter((_, j) => j !== i));
  const add = () => onChange([...lines, { count: '', rate: lines[lines.length - 1]?.rate ?? String(defaultRate), note: '' }]);
  const total = lines.reduce((s, l) => s + toNumber(l.count) * toNumber(l.rate), 0);
  const multi = lines.length > 1;

  return (
    <fieldset className="group-list group-list--form">
      <legend className="group-list__header group-list__legend">
        <span>{legend}</span>
        <b className="num">{formatUAH(total)}</b>
      </legend>
      <div className="group-list__body">
        {lines.map((l, i) => {
          const n = i + 1;
          const rate = toNumber(l.rate);
          return (
            <div key={i} className="rate-line">
              {multi && (
                <div className="rate-line__head">
                  <span>Ставка {n}</span>
                  {i > 0 && (
                    <button type="button" className="rate-line__remove" aria-label={`Прибрати ставку ${n}: ${legend.toLowerCase()}`} onClick={() => remove(i)}>
                      <X size={15} strokeWidth={2.6} />
                    </button>
                  )}
                </div>
              )}
              <NumberInput
                label={countLabel}
                srSuffix={i === 0 ? undefined : `(ставка ${n})`}
                value={l.count}
                onChange={(v) => update(i, { count: v })}
                max={maxCount}
                error={i === 0 ? countError : undefined}
              />
              <NumberInput
                label={rateLabel}
                srSuffix={i === 0 ? undefined : String(n)}
                value={l.rate}
                onChange={(v) => update(i, { rate: v })}
                suffix="₴"
                step={rateStep}
                decimal
                stepper={false}
                max={maxRate}
                error={validate && toNumber(l.count) > 0 && rate <= 0 ? `Вкажи ${rateLabel.toLowerCase()}` : undefined}
                hint={i === 0 && rate !== defaultRate && defaultRate > 0 ? `Зазвичай ${formatUAH(defaultRate)}` : undefined}
              />
              <LineNote
                label={`Коментар: ${legend.toLowerCase()}${multi ? `, ставка ${n}` : ''}`}
                value={l.note}
                onChange={(note) => update(i, { note })}
              />
            </div>
          );
        })}
        {lines.length < MAX_LINES && (
          <button type="button" className="add-line" onClick={add} aria-label={`Інша ставка: ${legend.toLowerCase()}`}>
            <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
            Додати іншу ставку
          </button>
        )}
      </div>
      {multi && <p className="group-list__footer num">{lines.map((l) => `${formatNumber(toNumber(l.count))} × ${formatUAH(toNumber(l.rate))}`).join(' + ')}</p>}
    </fieldset>
  );
}

/** One-line free-text label for a rate ("Група А", "з 15-го"). */
function LineNote({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="field line-note">
      <div className="field__box" onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}>
        <MessageSquareText className="line-note__icon" size={17} aria-hidden="true" />
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          className="line-note__input"
          type="text"
          value={value}
          maxLength={LINE_NOTE_MAX}
          placeholder="Коментар, напр. «група А»"
          autoComplete="off"
          enterKeyHint="done"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export const linesToForm = (lines: RateLine[]) =>
  lines.length
    ? lines.map((l) => ({ count: l.count ? String(l.count) : '', rate: l.rate ? String(l.rate) : '', note: l.note ?? '' }))
    : [{ count: '', rate: '', note: '' }];

/** Drops empty extra lines; always keeps at least one. */
export const formToLines = (lines: LineForm[]) => {
  const parsed: RateLine[] = lines.map((l) => {
    const note = l.note.trim();
    return note ? { count: toNumber(l.count), rate: toNumber(l.rate), note } : { count: toNumber(l.count), rate: toNumber(l.rate) };
  });
  const kept = parsed.filter((l, i) => i === 0 || l.count > 0);
  return kept.length ? kept : [{ count: 0, rate: 0 }];
};
