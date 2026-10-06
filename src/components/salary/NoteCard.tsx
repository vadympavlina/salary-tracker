import { Group } from '../ui/List';

export function NoteCard({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <Group title="Нотатка" id="note">
      <p className="note">{note}</p>
    </Group>
  );
}
