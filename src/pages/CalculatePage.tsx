import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { useRouter, Link } from '../router/router';
import { calculateSalary } from '../services/calculations/salaryCalculator';
import type { SalaryInput, SalaryRecord, SalarySettings } from '../types/salary';
import { currentPeriod, formatPeriod, shiftPeriod } from '../utils/period';
import { formatUAH } from '../utils/format';
import { fromNumber, toNumber } from '../utils/input';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { CurrencyInput, TextArea } from '../components/ui/fields';
import { RateLines, formToLines, linesToForm, type LineForm } from '../components/salary/RateLines';

interface FormState {
  period: string;
  pairItems: LineForm[];
  videoItems: LineForm[];
  advance: string;
  additional: string;
  received: string;
  cashReceived: string;
  note: string;
}

type TextKey = Exclude<keyof FormState, 'pairItems' | 'videoItems'>;

const toForm = (i: SalaryInput): FormState => ({
  period: i.period,
  pairItems: linesToForm(i.pairItems),
  videoItems: linesToForm(i.videoItems),
  advance: fromNumber(i.advance),
  additional: fromNumber(i.additional),
  received: fromNumber(i.received),
  cashReceived: fromNumber(i.cashReceived),
  note: i.note ?? '',
});

const blankForm = (s: SalarySettings, period: string): FormState => ({
  period,
  pairItems: [{ count: '', rate: fromNumber(s.pairRate), note: '' }],
  videoItems: [{ count: '', rate: fromNumber(s.videoRate), note: '' }],
  advance: fromNumber(s.defaultAdvance),
  additional: '',
  received: fromNumber(s.defaultCard),
  cashReceived: '',
  note: '',
});

const LIMITS = { pairs: 500, videos: 20_000, rate: 1_000_000, money: 10_000_000 };

export function CalculatePage() {
  const { settings, draft, setDraft, getRecord, findByPeriod, records } = useSalary();
  const { query, navigate } = useRouter();
  const editId = query.get('edit') ?? undefined;
  const isNew = query.get('new') === '1';
  // Opened from a record's "Редагувати": shows a back button to that record.
  const editing: SalaryRecord | undefined = editId ? getRecord(editId) : undefined;

  /**
   * One record per month: the form always shows the selected month. If the month already
   * has data (from the counter or an earlier calculation) it opens filled in and saving updates it,
   * so nothing typed or counted earlier is ever wiped.
   */
  const monthForm = (period: string): { form: FormState; baseId?: string } => {
    const rec = findByPeriod(period);
    return rec ? { form: toForm(rec), baseId: rec.id } : { form: blankForm(settings, period) };
  };

  const [state, setState] = useState<{ form: FormState; baseId?: string }>(() => {
    if (editing) return { form: draft?.editId === editing.id ? toForm(draft.input) : toForm(editing), baseId: editing.id };
    if (!isNew && draft) return { form: toForm(draft.input), baseId: draft.editId };
    return monthForm(currentPeriod());
  });
  const { form, baseId } = state;
  const base = baseId ? getRecord(baseId) : undefined;
  const setForm = (update: (f: FormState) => FormState) => setState((s) => ({ ...s, form: update(s.form) }));
  const [touched, setTouched] = useState(false);

  const goToPeriod = (period: string) => {
    setState(monthForm(period));
    setTouched(false);
  };

  // "?new=1" is a one-shot instruction: open the current month fresh, then drop it from the URL
  // so a refresh keeps the draft.
  useEffect(() => {
    if (!isNew) return;
    setState(monthForm(currentPeriod()));
    setTouched(false);
    setDraft(null);
    navigate('/calculate', { replace: true });
    // Runs only when the "?new=1" flag appears; the other values are read fresh at that moment.
  }, [isNew]);

  const input: SalaryInput = useMemo(
    () => ({
      period: form.period,
      pairItems: formToLines(form.pairItems),
      videoItems: formToLines(form.videoItems),
      advance: toNumber(form.advance),
      additional: toNumber(form.additional),
      received: toNumber(form.received),
      cashReceived: toNumber(form.cashReceived),
      advanceMode: base?.advanceMode ?? settings.advanceMode,
      note: form.note.trim() || undefined,
    }),
    [form, base, settings.advanceMode],
  );
  const calc = useMemo(() => calculateSalary(input), [input]);

  // Persist the work-in-progress so switching tabs or refreshing never loses typed data.
  useEffect(() => {
    const t = window.setTimeout(() => setDraft({ input, editId: baseId }), 250);
    return () => window.clearTimeout(t);
  }, [input, baseId, setDraft]);

  const set = (key: TextKey) => (v: string) => setForm((f) => ({ ...f, [key]: v }));


  const missingRate = [...input.pairItems, ...input.videoItems].some((l) => l.count > 0 && l.rate <= 0);
  const isEmpty = calc.grossIncome <= 0 && !missingRate;
  const emptyError = touched && calc.pairs === 0 && calc.videos === 0 && !toNumber(form.additional) ? 'Вкажи хоча б пари, відео або додаткові виплати' : undefined;
  const hasErrors = missingRate || !!emptyError;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (isEmpty || missingRate) return;
    setDraft({ input, editId: baseId });
    navigate('/calculate/result');
  };

  const fillCash = () => set('cashReceived')(fromNumber(calc.netIncome));
  const overpaid = calc.grossIncome > 0 && calc.advance + calc.received > calc.grossIncome;
  const lastRecord = records[0];

  return (
    <form className="calc" onSubmit={submit} noValidate>
      <PageHeader
        title={editing ? 'Редагування' : 'Розрахунок'}
        backTo={editing ? `/history/${editing.id}` : undefined}
      />

      <div className="calc__layout">
        <div className="calc__fields">
          <div className="calc__period">
            <div className="month-picker">
              <button type="button" className="month-picker__btn" aria-label="Попередній місяць" onClick={() => goToPeriod(shiftPeriod(form.period, -1))}>
                <ChevronLeft size={20} strokeWidth={2.4} />
              </button>
              <div className="month-picker__value" aria-live="polite">
                <b>{formatPeriod(form.period)}</b>
                <small>{base ? (editing ? 'зміни оновлять запис' : 'вже є дані — доповни їх') : 'новий місяць'}</small>
              </div>
              <button type="button" className="month-picker__btn" aria-label="Наступний місяць" onClick={() => goToPeriod(shiftPeriod(form.period, 1))}>
                <ChevronRight size={20} strokeWidth={2.4} />
              </button>
            </div>
            {base && !editing && (
              <Link to={`/history/${base.id}`} className="link calc__open">
                Відкрити збережений
              </Link>
            )}
          </div>

          <RateLines
            legend="Пари"
            countLabel="Кількість пар"
            rateLabel="Ставка за пару"
            lines={form.pairItems}
            onChange={(pairItems) => setForm((f) => ({ ...f, pairItems }))}
            maxCount={LIMITS.pairs}
            maxRate={LIMITS.rate}
            rateStep={10}
            defaultRate={settings.pairRate}
            countError={emptyError}
            validate={touched}
          />

          <RateLines
            legend="Відео"
            countLabel="Перевірені відео"
            rateLabel="Ставка за відео"
            lines={form.videoItems}
            onChange={(videoItems) => setForm((f) => ({ ...f, videoItems }))}
            maxCount={LIMITS.videos}
            maxRate={LIMITS.rate}
            rateStep={1}
            defaultRate={settings.videoRate}
            validate={touched}
          />

          <fieldset className="group-list group-list--form">
            <legend className="group-list__header group-list__legend">
              <span>Виплати</span>
            </legend>
            <div className="group-list__body">
              <CurrencyInput label="Додаткові" value={form.additional} onChange={set('additional')} max={LIMITS.money} hint="Премії, доплати, бонуси" />
              <CurrencyInput
                label="Аванс"
                value={form.advance}
                onChange={set('advance')}
                max={LIMITS.money}
                hint={input.advanceMode === 'part' ? 'Вже отримана частина' : 'Додається до нарахувань'}
              />
              <CurrencyInput
                label="На картку"
                value={form.received}
                onChange={set('received')}
                max={LIMITS.money}
                error={overpaid ? 'Аванс і картка більші за нараховане' : undefined}
                hint={settings.defaultCard > 0 && toNumber(form.received) !== settings.defaultCard ? `Зазвичай ${formatUAH(settings.defaultCard)}` : 'Зарплата на картку'}
              />
            </div>
          </fieldset>

          <fieldset className="group-list group-list--form">
            <legend className="group-list__header group-list__legend">
              <span>На руки</span>
            </legend>
            <div className="group-list__body">
              <div className="hand-callout" aria-live="polite">
                <span className="hand-callout__text">
                  <span>Сума на руки</span>
                  <small className="num">
                    {formatUAH(calc.grossIncome)} − {formatUAH(calc.advance)} − {formatUAH(calc.received)}
                  </small>
                </span>
                <b className="num">{formatUAH(calc.netIncome)}</b>
              </div>
              <CurrencyInput
                label="Отримано на руки"
                value={form.cashReceived}
                onChange={set('cashReceived')}
                max={LIMITS.money}
                hint={
                  calc.netIncome > 0 ? (
                    input.cashReceived >= calc.netIncome ? (
                      'Усе отримано'
                    ) : (
                      <>
                        Залишилось <b className="num">{formatUAH(calc.remaining)}</b>
                      </>
                    )
                  ) : undefined
                }
              />
              {calc.netIncome > 0 && input.cashReceived < calc.netIncome && (
                <button type="button" className="add-line" onClick={fillCash}>
                  <Check size={18} strokeWidth={2.6} aria-hidden="true" />
                  Отримав усе
                </button>
              )}
            </div>
          </fieldset>

          <fieldset className="group-list group-list--form">
            <legend className="group-list__header group-list__legend">
              <span>Нотатка</span>
            </legend>
            <div className="group-list__body">
              <TextArea label="Коментар до місяця" hideLabel value={form.note} onChange={set('note')} placeholder="Напр.: премія за курс, затримали виплату" />
            </div>
          </fieldset>

          {!base && lastRecord && lastRecord.period !== form.period && calc.pairs === 0 && calc.videos === 0 && (
            <button
              type="button"
              className="chip chip--block"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  pairItems: linesToForm(lastRecord.pairItems),
                  videoItems: linesToForm(lastRecord.videoItems),
                  advance: fromNumber(lastRecord.advance),
                  additional: fromNumber(lastRecord.additional),
                }))
              }
            >
              <Copy size={17} aria-hidden="true" />
              Заповнити як за {formatPeriod(lastRecord.period).toLowerCase()}
            </button>
          )}
        </div>

        <div className="calc__summary">
          <div className="action-bar action-bar--calc">
            <div className="live-total" aria-live="polite">
              <span>На руки</span>
              <b className="num">{formatUAH(calc.netIncome)}</b>
              {calc.grossIncome > 0 && (
                <small className="num">
                  з {formatUAH(calc.grossIncome)}
                  {calc.remaining > 0 ? ` · ще ${formatUAH(calc.remaining)}` : ' · усе отримано'}
                </small>
              )}
            </div>
            <Button type="submit" disabled={touched && (hasErrors || isEmpty)}>
              Розрахувати
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
