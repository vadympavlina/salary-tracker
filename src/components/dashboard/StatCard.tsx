import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
}

export function StatCard({ label, value, icon, hint }: Props) {
  return (
    <div className="stat">
      {icon && (
        <span className="stat__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="stat__label">{label}</span>
      <span className="stat__value num">{value}</span>
      {hint && <span className="stat__hint">{hint}</span>}
    </div>
  );
}
