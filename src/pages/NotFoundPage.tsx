import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Сторінку не знайдено" />
      <EmptyState icon={<Compass size={30} />} title="Можливо, посилання застаріло" text="Перевір адресу або повернися на головну." action={<Button to="/">На головну</Button>} />
    </>
  );
}
