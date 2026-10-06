import { Check, Clock3, CircleDashed } from 'lucide-react';
import type { PaymentStatus as Status } from '../../types/salary';

export const STATUS_LABEL: Record<Status, string> = {
  paid: 'Виплачено',
  partial: 'Частково',
  pending: 'Очікується',
};

export function PaymentStatus({ status, onDark = false }: { status: Status; onDark?: boolean }) {
  const Icon = status === 'paid' ? Check : status === 'partial' ? CircleDashed : Clock3;
  return (
    <span className={`status status--${status}${onDark ? ' status--on-dark' : ''}`}>
      <Icon size={13} strokeWidth={2.6} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}
