import { GlassTabs } from './GlassTabs';

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

/** iOS segmented control = Glisse glass tab bar (tabs; arrow keys move, the lens can be dragged). */
export function Segmented<T extends string>({ options, value, onChange, label, size = 'md' }: Props<T>) {
  return (
    <GlassTabs
      className={`segmented-glass segmented-glass--${size}`}
      label={label}
      value={value}
      onChange={(v) => onChange(v as T)}
      items={options.map((o) => ({
        value: o.value,
        label: (
          <>
            {o.label}
            {o.badge !== undefined && <span className="segmented__badge num">{o.badge}</span>}
          </>
        ),
      }))}
    />
  );
}
