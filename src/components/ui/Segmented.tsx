import { useRef, type KeyboardEvent, type CSSProperties } from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
  badge?: number;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: 'md' | 'sm';
}

/** iOS-style segmented control with a sliding thumb; arrow keys move selection (radiogroup pattern). */
export function Segmented<T extends string>({ options, value, onChange, label, size = 'md' }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const style = { '--count': options.length, '--index': index } as CSSProperties;

  return (
    <div className={`segmented segmented--${size}`} role="radiogroup" aria-label={label} style={style} onKeyDown={onKey}>
      <span className="segmented__thumb" aria-hidden="true" />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className="segmented__item"
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.badge !== undefined && <span className="segmented__badge num">{o.badge}</span>}
        </button>
      ))}
    </div>
  );
}
