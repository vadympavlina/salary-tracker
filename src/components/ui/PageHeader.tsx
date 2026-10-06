import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from '../../router/router';
import { IconButton } from './Button';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small caps line above the title (e.g. today's date). */
  eyebrow?: ReactNode;
  /** Shows a back button; value is where to go when there is no in-app history. */
  backTo?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, backTo, actions }: Props) {
  const { back } = useRouter();
  return (
    <header className={`page-header${backTo ? ' page-header--sub' : ''}`}>
      {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
      <div className="page-header__row">
        {backTo && (
          <IconButton label="Назад" onClick={() => back(backTo)} className="page-header__back">
            <ChevronLeft size={22} strokeWidth={2.2} />
          </IconButton>
        )}
        <h1 className="page-header__title">{title}</h1>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    </header>
  );
}
