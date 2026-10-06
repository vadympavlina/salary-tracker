import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Banknote, ChevronLeft, ChevronRight, CirclePlay, CreditCard, Gift, HandCoins, Info, UsersRound, Wallet } from 'lucide-react';
import { useSalary } from '../hooks/useSalaryStore';
import { useRouter, Link } from '../router/router';
import { calculateSalary } from '../services/calculations/salaryCalculator';
import type { SalaryInput, SalaryRecord, SalarySettings } from '../types/salary';
import { currentPeriod, formatPeriod, shiftPeriod } from '../utils/period';
import { formatUAH } from '../utils/format';
import { fromNumber, toNumber } from '../utils/input';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { CurrencyInput, NumberInput } from '../components/ui/fields';

interface FormState {
  period: string;
  pairs: string;
  pairRate: string;
  videos: string;
  videoRate: string;
  advance: string;
  additional: string;
  received: string;
}

const toForm = (i: SalaryInput): FormState => ({
  period: i.period,
  pairs: fromNumber(i.pairs),
  pairRate: fromNumber(i.pairRate),
  videos: fromNumber(i.videos),
  videoRate: fromNumber(i.videoRate),
  advance: fromNumber(i.advance),
  additional: fromNumber(i.additional),
  received: fromNumber(i.received),
});

const blankForm = (s: SalarySettings, period: string): FormState => ({
  period,
  pairs: '',
  pairRate: fromNumber(s.pairRate),
  videos: '',
  videoRate: fromNumber(s.videoRate),
  advance: fromNumber(s.defaultAdvance),
  additional: '',
  received: '',
});

const LIMITS = { pairs: 500, videos: 20_000, rate: 1_000_000, money: 10_000_000 };

export function CalculatePage() {
  const { settings, draft, setDraft, getRecord, findByPeriod, records } = useSalary();
  const { query, navigate } = useRouter();
  const editId = query.get('edit') ?? undefined;
  const isNew = query.get('new') === '1';
  const editing: SalaryRecord | undefined = editId ? getRecord(editId) : undefined;

  const [form, setForm] = useState<FormState>(() => {
    if (editing) return draft?.editId === editing.id ? toForm(draft.input) : toForm(editing);
    if (!isNew && draft && !draft.editId) return toForm(draft.input);
    return blankForm(settings, currentPeriod());
  });
  const [touched, setTouched] = useState(false);

  // "?new=1" is a one-shot instruction: start blank, then drop it from the URL so a refresh keeps the draft.
  useEffect(() => {
    if (!isNew) return;
    setForm(blankForm(settings, currentPeriod()));
    setTouched(false);
    setDraft(null);
    navigate('/calculate', { replace: true });
  }, [isNew, settings, setDraft, navigate]);

  const input: SalaryInput = useMemo(
    () => ({
      period: form.period,
      pairs: toNumber(form.pairs),
      pairRate: toNumber(form.pairRate),
      videos: toNumber(form.videos),
      videoRate: toNumber(form.videoRate),
      advance: toNumber(form.advance),
      additional: toNumber(form.additional),
      received: toNumber(form.received),
      advanceMode: editing?.advanceMode ?? settings.advanceMode,
      taxRate: editing?.taxRate ?? settings.taxRate,
    }),
    [form, editing, settings.advanceMode, settings.taxRate],
  );
  const calc = useMemo(() => calculateSalary(input), [input]);

  // Persist the work-in-progress so switching tabs or refreshing never loses typed data.
  useEffect(() => {
    const t = window.setTimeout(() => setDraft({ input, editId: editing?.id }), 250);
    return () => window.clearTimeout(t);
  }, [input, editing?.id, setDraft]);

  const set = (key: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const conflict = findByPeriod(form.period);
  const conflictOther = conflict && conflict.id !== editing?.id ? conflict : undefined;

  const errors = {
    pairs: touched && !form.pairs && !form.videos && !form.additional ? 'Вкажи хоча б пари, відео або додаткові виплати' : undefined,
    pairRate: touched && input.pairs > 0 && input.pairRate <= 0 ? 'Вкажи ставку за пару' : undefined,
    videoRate: touched && input.videos > 0 && input.videoRate <= 0 ? 'Вкажи ставку за відео' : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const isEmpty = calc.grossIncome <= 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const invalid = isEmpty || (input.pairs > 0 && input.pairRate <= 0) || (input.videos > 0 && input.videoRate <= 0);
    if (invalid) return;
    setDraft({ input, editId: editing?.id });
    navigate('/calculate/result');
  };

  const fillReceived = () => set('received')(fromNumber(calc.expectedOnCard));
  const rateDiff = (v: number, def: number) => (v !== def && def > 0 ? `За замовчуванням ${formatUAH(def)}` : undefined);
  const lastRecord = records[0];

  return (
    <form className="calc" onSubmit={submit} noValidate>
      <PageHeader
        title={editing ? 'Редагування' : 'Розрахунок'}
        subtitle={editing ? `Зміни дані за ${formatPeriod(editing.period).toLowerCase()}` : 'Введи дані для розрахунку зарплати'}
        backTo={editing ? `/history/${editing.id}` : undefined}
      />

      <div className="calc__layout">
        <div className="calc__fields stack">
          <div className="month-picker card">
            <button type="button" className="month-picker__btn" aria-label="Попередній місяць" onClick={() => set('period')(shiftPeriod(form.period, -1))}>
              <ChevronLeft size={20} />
            </button>
            <div className="month-picker__value" aria-live="polite">
              <small>Період</small>
              <b>{formatPeriod(form.period)}</b>
            </div>
            <button type="button" className="month-picker__btn" aria-label="Наступний місяць" onClick={() => set('period')(shiftPeriod(form.period, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>
          {conflictOther && (
            <p className="notice notice--warn" role="status">
              <Info size={18} aria-hidden="true" />
              <span>
                За {formatPeriod(form.period).toLowerCase()} вже є розрахунок — збереження його замінить.{' '}
                <Link to={`/history/${conflictOther.id}`} className="link">
                  Відкрити
                </Link>
              </span>
            </p>
          )}

          <fieldset className="group">
            <legend className="group__title">Пари</legend>
            <NumberInput label="Кількість пар" value={form.pairs} onChange={set('pairs')} icon={<UsersRound size={20} />} max={LIMITS.pairs} error={errors.pairs} />
            <NumberInput
              label="Ставка за пару"
              value={form.pairRate}
              onChange={set('pairRate')}
              icon={<Banknote size={20} />}
              suffix="₴"
              step={10}
              decimal
              max={LIMITS.rate}
              error={errors.pairRate}
              hint={rateDiff(input.pairRate, settings.pairRate)}
            />
            <p className="group__sum">
              <span className="num">
                {input.pairs} × {formatUAH(input.pairRate)}
              </span>
              <b className="num">{formatUAH(calc.pairIncome)}</b>
            </p>
          </fieldset>

          <fieldset className="group">
            <legend className="group__title">Відео</legend>
            <NumberInput label="Перевірені відео" value={form.videos} onChange={set('videos')} icon={<CirclePlay size={20} />} max={LIMITS.videos} />
            <NumberInput
              label="Ставка за відео"
              value={form.videoRate}
              onChange={set('videoRate')}
              icon={<Wallet size={20} />}
              suffix="₴"
              step={1}
              decimal
              max={LIMITS.rate}
              error={errors.videoRate}
              hint={rateDiff(input.videoRate, settings.videoRate)}
            />
            <p className="group__sum">
              <span className="num">
                {input.videos} × {formatUAH(input.videoRate)}
              </span>
              <b className="num">{formatUAH(calc.videoIncome)}</b>
            </p>
          </fieldset>

          <fieldset className="group">
            <legend className="group__title">Додаткові виплати</legend>
            <CurrencyInput
              label="Аванс"
              value={form.advance}
              onChange={set('advance')}
              icon={<HandCoins size={20} />}
              max={LIMITS.money}
              hint={input.advanceMode === 'part' ? 'Частина зарплати, вже отримана' : 'Додається до нарахувань'}
            />
            <CurrencyInput label="Додаткові" value={form.additional} onChange={set('additional')} icon={<Gift size={20} />} max={LIMITS.money} hint="Премії, доплати, бонуси" />
          </fieldset>

          <fieldset className="group">
            <legend className="group__title">Фактична виплата</legend>
            <CurrencyInput
              label="Сума, яка прийшла на картку"
              value={form.received}
              onChange={set('received')}
              icon={<CreditCard size={20} />}
              max={LIMITS.money}
              hint={
                calc.expectedOnCard > 0 ? (
                  <>
                    Має прийти: <b className="num">{formatUAH(calc.expectedOnCard)}</b>
                    {input.received !== calc.expectedOnCard && (
                      <button type="button" className="chip" onClick={fillReceived}>
                        Прийшло все
                      </button>
                    )}
                  </>
                ) : undefined
              }
            />
          </fieldset>

          {!editing && lastRecord && !form.pairs && !form.videos && (
            <button
              type="button"
              className="chip chip--block"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  pairs: fromNumber(lastRecord.pairs),
                  pairRate: fromNumber(lastRecord.pairRate),
                  videos: fromNumber(lastRecord.videos),
                  videoRate: fromNumber(lastRecord.videoRate),
                  advance: fromNumber(lastRecord.advance),
                  additional: fromNumber(lastRecord.additional),
                }))
              }
            >
              Заповнити як за {formatPeriod(lastRecord.period).toLowerCase()}
            </button>
          )}
        </div>

        <div className="calc__summary">
          <div className="action-bar action-bar--calc">
            <div className="live-total" aria-live="polite">
              <span>На руки</span>
              <b className="num">{formatUAH(calc.netIncome)}</b>
              {calc.netIncome > 0 && (
                <small className="num">{calc.remaining > 0 ? `ще отримати ${formatUAH(calc.remaining)}` : 'усе отримано'}</small>
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
