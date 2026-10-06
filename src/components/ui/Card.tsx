import type { HTMLAttributes, ReactNode } from 'react';

interface Props extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  action?: ReactNode;
  as?: 'section' | 'div' | 'article';
  flush?: boolean;
}

export function Card({ title, action, as: Tag = 'section', flush, className = '', children, ...rest }: Props) {
  return (
    <Tag className={`card${flush ? ' card--flush' : ''} ${className}`.trim()} {...rest}>
      {(title || action) && (
        <div className="card__head">
          {title && <h2 className="card__title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {action}
    </div>
  );
}
