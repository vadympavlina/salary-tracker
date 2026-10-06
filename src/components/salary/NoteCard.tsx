import { NotebookPen } from 'lucide-react';

export function NoteCard({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <section className="note card" aria-label="Нотатка">
      <NotebookPen size={18} aria-hidden="true" />
      <p>{note}</p>
    </section>
  );
}
