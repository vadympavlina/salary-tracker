import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { groupAmount, sanitizeAmount, toNumber } from '../../utils/input';

interface FieldShellProps {
  id: string;
  label: string;
  icon?: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  trailing?: ReactNode;
}

/** Shared visual shell: icon tile, small label above a large value. Whole card focuses the input. */
function FieldShell({ id, label, icon, hint, error, children, trailing }: FieldShellProps) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <div className="field__box" onClick={(e) => (e.currentTarget.querySelector('input, textarea') as HTMLElement | null)?.focus()}>
        {icon && (
          <span className="field__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="field__main">
          <label htmlFor={id} className="field__label">
            {label}
          </label>
          {children}
        </div>
        {trailing}
      </div>
      {(error || hint) && (
        <p id={`${id}-msg`} className={error ? 'field__error' : 'field__hint'} role={error ? 'alert' : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

/** Keeps the caret next to the same digit after we re-format the value with spaces. */
function useCaretKeeper(display: string) {
  const ref = useRef<HTMLInputElement>(null);
  const digitsBefore = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const want = digitsBefore.current;
    if (!el || want === null || document.activeElement !== el) return;
    let pos = 0;
    let seen = 0;
    while (pos < display.length && seen < want) {
      if (/[\d,]/.test(display[pos])) seen++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    digitsBefore.current = null;
  }, [display]);
  const remember = (el: HTMLInputElement) => {
    const caret = el.selectionStart ?? el.value.length;
    digitsBefore.current = el.value.slice(0, caret).replace(/[^\d.,]/g, '').length;
  };
  return { ref, remember };
}

interface AmountProps {
  label: string;
  value: string;
  onChange: (raw: string) => void;
  icon?: ReactNode;
  hint?: ReactNode;
  error?: string;
  max?: number;
  placeholder?: string;
  suffix?: string;
  trailing?: ReactNode;
}

/** Hryvnia input: numeric keyboard, live thousands grouping, kopecks allowed, empty allowed. */
export function CurrencyInput({ label, value, onChange, icon, hint, error, max = 10_000_000, placeholder = '0', suffix = '₴', trailing }: AmountProps) {
  const id = useId();
  const display = groupAmount(value);
  const { ref, remember } = useCaretKeeper(display);
  return (
    <FieldShell id={id} label={label} icon={icon} hint={hint} error={error} trailing={trailing}>
      <div className="field__value-row">
        <input
          ref={ref}
          id={id}
          className="field__input num"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          placeholder={placeholder}
          value={display}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          onChange={(e) => {
            remember(e.target);
            const raw = sanitizeAmount(e.target.value);
            if (toNumber(raw) > max) return;
            onChange(raw);
          }}
          onFocus={(e) => e.currentTarget.select()}
        />
        {suffix && (
          <span className="field__suffix" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

interface NumberProps {
  label: string;
  value: string;
  onChange: (raw: string) => void;
  icon?: ReactNode;
  hint?: ReactNode;
  error?: string;
  max?: number;
  step?: number;
  /** Stepper may also step a currency-like value, e.g. rates. */
  suffix?: string;
  decimal?: boolean;
}

/** Integer (or rate) input with large −/+ steppers. Press-and-hold repeats. */
export function NumberInput({ label, value, onChange, icon, hint, error, max = 100_000, step = 1, suffix, decimal = false }: NumberProps) {
  const id = useId();
  const display = suffix ? groupAmount(value) : value;
  const { ref, remember } = useCaretKeeper(display);
  const valueRef = useRef(value);
  valueRef.current = value;
  const timer = useRef<number | undefined>(undefined);

  const bump = (dir: 1 | -1) => {
    const next = Math.min(max, Math.max(0, Math.round((toNumber(valueRef.current) + dir * step) * 100) / 100));
    const raw = next === 0 && dir < 0 ? '0' : String(next);
    valueRef.current = raw;
    onChange(raw);
    if ('vibrate' in navigator) navigator.vibrate?.(4);
  };

  const stop = () => {
    window.clearTimeout(timer.current);
    window.clearInterval(timer.current);
    timer.current = undefined;
  };
  useEffect(() => stop, []);

  const start = (dir: 1 | -1) => {
    bump(dir);
    stop();
    timer.current = window.setTimeout(() => {
      timer.current = window.setInterval(() => bump(dir), 70);
    }, 380);
  };

  const n = toNumber(value);
  const stepper = (dir: 1 | -1) => (
    <button
      type="button"
      className="stepper__btn"
      aria-label={`${dir > 0 ? 'Збільшити' : 'Зменшити'}: ${label}`}
      disabled={dir < 0 ? n <= 0 : n >= max}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        start(dir);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          bump(dir);
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {dir > 0 ? <Plus size={20} strokeWidth={2.2} /> : <Minus size={20} strokeWidth={2.2} />}
    </button>
  );

  return (
    <FieldShell
      id={id}
      label={label}
      icon={icon}
      hint={hint}
      error={error}
      trailing={
        <div className="stepper" onClick={(e) => e.stopPropagation()}>
          {stepper(-1)}
          {stepper(1)}
        </div>
      }
    >
      <div className="field__value-row">
        <input
          ref={ref}
          id={id}
          className="field__input num"
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          pattern={decimal ? undefined : '[0-9]*'}
          autoComplete="off"
          enterKeyHint="next"
          placeholder="0"
          value={display}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          onChange={(e) => {
            remember(e.target);
            const raw = sanitizeAmount(e.target.value, decimal);
            if (toNumber(raw) > max) return;
            onChange(raw);
          }}
          onFocus={(e) => e.currentTarget.select()}
        />
        {suffix && (
          <span className="field__suffix" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

interface TextProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  maxLength?: number;
}

export function TextInput({ label, value, onChange, autoComplete, maxLength = 60 }: TextProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label}>
      <input id={id} className="field__input field__input--text" type="text" value={value} maxLength={maxLength} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
    </FieldShell>
  );
}

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  icon?: ReactNode;
}

/** Multi-line text (notes). Grows with content. */
export function TextArea({ label, value, onChange, placeholder, maxLength = 500, icon }: TextAreaProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} icon={icon} hint={value.length > maxLength * 0.8 ? `${value.length}/${maxLength}` : undefined}>
      <textarea
        id={id}
        className="field__input field__input--area"
        rows={2}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}
