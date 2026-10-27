import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button as GlassButton } from 'glisse';
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

/**
 * Buttons are Glisse Liquid Glass buttons (refraction, press light-up, spring):
 * primary → filled with the accent, secondary → clear glass, tinted → glass with accent label,
 * danger → red glass (with the `grow` class: red filled, for the confirm step).
 * Links stay real <a> elements (navigation) and get the same look from our CSS.
 */
export function Button({ variant = 'primary', size = 'lg', icon, block, to, className = '', children, type = 'button', ...rest }: Props) {
  const cls = `btn btn--${variant} btn--${size}${block ? ' btn--block' : ''} ${className}`.trim();
  if (to) {
    return (
      <Link to={to} className={cls} aria-label={rest['aria-label']}>
        {icon}
        {children && <span>{children}</span>}
      </Link>
    );
  }
  const filled = variant === 'primary' || (variant === 'danger' && /\bgrow\b/.test(className));
  return (
    <GlassButton
      type={type}
      className={`${cls} glass-btn`}
      variant={filled ? 'filled' : 'glass'}
      destructive={variant === 'danger'}
      tint={variant === 'tinted' || variant === 'ghost' ? 'var(--accent-text)' : undefined}
      icon={icon}
      {...rest}
    >
      {children}
    </GlassButton>
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
    <GlassButton
      type={type}
      className={`${cls} glass-btn`}
      variant={tone === 'accent' ? 'filled' : 'glass'}
      tint={tone === 'accent' ? undefined : 'var(--accent-text)'}
      icon={children}
      aria-label={label}
      title={label}
      {...rest}
    />
  );
}
