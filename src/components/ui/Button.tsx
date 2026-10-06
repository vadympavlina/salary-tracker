import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from '../../router/router';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tinted';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'lg' | 'md' | 'sm';
  icon?: ReactNode;
  block?: boolean;
  /** Renders a router link styled as a button. */
  to?: string;
}

export function Button({ variant = 'primary', size = 'lg', icon, block, to, className = '', children, type = 'button', ...rest }: Props) {
  const cls = `btn btn--${variant} btn--${size}${block ? ' btn--block' : ''} ${className}`.trim();
  const content = (
    <>
      {icon}
      {children && <span>{children}</span>}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls} aria-label={rest['aria-label']}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} {...rest}>
      {content}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  to?: string;
  tone?: 'plain' | 'surface' | 'accent';
}

export function IconButton({ label, to, tone = 'surface', className = '', children, type = 'button', ...rest }: IconButtonProps) {
  const cls = `icon-btn icon-btn--${tone} ${className}`.trim();
  if (to) {
    return (
      <Link to={to} className={cls} aria-label={label} title={label}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
