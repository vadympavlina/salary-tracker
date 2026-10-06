import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}

export function ChartCard({ title, subtitle, children, action }: Props) {
  return (
    <section className="card chart-card">
      <div className="chart-card__head">
        <div>
          <h2 className="card__title">{title}</h2>
          {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
