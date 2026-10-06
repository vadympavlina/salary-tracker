import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from '../../router/router';

export type TileColor = 'violet' | 'blue' | 'green' | 'orange' | 'pink' | 'teal' | 'grey' | 'red';

interface GroupProps {
  title?: ReactNode;
  /** Small link/button on the right of the header, e.g. "Усі". */
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Renders the rows as a <ul> (rows must be <li>). */
  list?: boolean;
  id?: string;
  'aria-label'?: string;
}

/** iOS "inset grouped" section: optional caption above, rounded block of rows, optional footnote below. */
export function Group({ title, action, footer, children, className = '', list, id, ...rest }: GroupProps) {
  const Body = list ? 'ul' : 'div';
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section className={`group-list ${className}`.trim()} aria-labelledby={title ? headingId : undefined} aria-label={title ? undefined : rest['aria-label']}>
      {(title || action) && (
        <div className="group-list__header">
          {title && <h2 id={headingId}>{title}</h2>}
          {action}
        </div>
      )}
      <Body className="group-list__body">{children}</Body>
      {footer && <div className="group-list__footer">{footer}</div>}
    </section>
  );
}

/** Small rounded colour square with a white glyph, like the iOS Settings app. */
export function Tile({ color, children }: { color: TileColor; children: ReactNode }) {
  return (
    <span className={`tile tile--${color}`} aria-hidden="true">
      {children}
    </span>
  );
}

interface RowProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  /** Shows a chevron; the row is a link (to) or a button (onClick). */
  to?: string;
  onClick?: () => void;
  tone?: 'danger' | 'accent';
  strong?: boolean;
  className?: string;
  as?: 'li' | 'div';
}

/** One row: [tile] title / subtitle ……… value ›. Links and buttons get the chevron. */
export function Row({ icon, title, subtitle, value, to, onClick, tone, strong, className = '', as: Wrap = 'div' }: RowProps) {
  const interactive = !!(to || onClick);
  const cls = `row${tone ? ` row--${tone}` : ''}${strong ? ' row--strong' : ''}${interactive ? ' row--action' : ''} ${className}`.trim();
  const content = (
    <>
      {icon}
      <span className="row__label">
        <span className="row__title">{title}</span>
        {subtitle && <small className="row__sub">{subtitle}</small>}
      </span>
      {value !== undefined && <span className="row__value num">{value}</span>}
      {interactive && <ChevronRight className="row__chevron" size={18} strokeWidth={2.4} aria-hidden="true" />}
    </>
  );
  const inner = to ? (
    <Link to={to} className={cls}>
      {content}
    </Link>
  ) : onClick ? (
    <button type="button" className={cls} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
  return Wrap === 'li' ? <li>{inner}</li> : inner;
}
