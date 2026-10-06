import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass size={30} />}
      title="Сторінку не знайдено"
      text="Можливо, посилання застаріло."
      action={<Button to="/">На головну</Button>}
    />
  );
}
