'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Room = { id: string; name: string; sort: number };

export function RoomListDnD({
  projectId,
  initialRooms,
  onReorder, // server action
  moveUpAction, // optional fallback (kept for buttons in each card)
  moveDownAction,
  renameAction,
  deleteAction,
}: {
  projectId: string;
  initialRooms: Room[];
  onReorder: (projectId: string, orderedIds: string[]) => Promise<void>;
  moveUpAction?: (formData: FormData) => void;
  moveDownAction?: (formData: FormData) => void;
  renameAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
}) {
  const [rooms, setRooms] = React.useState<Room[]>(
    [...initialRooms].sort((a, b) => a.sort - b.sort)
  );
  const [dragId, setDragId] = React.useState<string | null>(null);
  const dragging = React.useMemo(() => new Set([dragId].filter(Boolean) as string[]), [dragId]);

  function handleDragStart(id: string, e: React.DragEvent) {
    setDragId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(overId: string, e: React.DragEvent) {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    const from = rooms.findIndex((r) => r.id === dragId);
    const to = rooms.findIndex((r) => r.id === overId);
    if (from === -1 || to === -1) return;

    const next = [...rooms];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // Optimistic UI while dragging
    setRooms(next);
  }

  async function handleDragEnd() {
    const orderedIds = rooms.map((r, i) => r.id);
    setDragId(null);
    try {
      await onReorder(projectId, orderedIds);
      // no-op (UI already optimistic). If you want, you could refetch; not needed here.
    } catch (err) {
      console.error('Reorder failed', err);
      // (Optional) show toast and/or revert — keeping optimistic simplicity for now.
    }
  }

  return (
    <ul className="auto-grid" style={{ ['--min-card' as any]: '280px' }}>
      {rooms.map((r, idx) => (
        <li
          key={r.id}
          draggable
          onDragStart={(e) => handleDragStart(r.id, e)}
          onDragOver={(e) => handleDragOver(r.id, e)}
          onDragEnd={handleDragEnd}
          className={[
            'rounded-md border p-3 flex flex-col gap-2 bg-card',
            dragging.has(r.id) ? 'opacity-80 ring-2 ring-primary' : 'card-elevated',
            'cursor-grab active:cursor-grabbing select-none',
          ].join(' ')}
          style={{ breakInside: 'avoid' }}
          aria-grabbed={dragging.has(r.id) || undefined}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium flex-1 truncate">{r.name}</span>

            {/* Fallback move buttons (still useful on keyboard / no DnD) */}
            <div className="flex items-center gap-1">
              <form action={moveUpAction}>
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="room_id" value={r.id} />
                <input type="hidden" name="dir" value="up" />
                <Button type="submit" variant="outline" size="sm" title="Move up" disabled={idx === 0}>↑</Button>
              </form>
              <form action={moveDownAction}>
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="room_id" value={r.id} />
                <input type="hidden" name="dir" value="down" />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  title="Move down"
                  disabled={idx === rooms.length - 1}
                >
                  ↓
                </Button>
              </form>
            </div>
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground underline">
              Rename or delete
            </summary>
            <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <form action={renameAction} className="flex gap-2 w-full sm:w-auto">
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="room_id" value={r.id} />
                <Input name="name" defaultValue={r.name} className="h-9 w-full sm:w-56" />
                <Button variant="outline" size="sm">Save</Button>
              </form>
              <form action={deleteAction}>
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="room_id" value={r.id} />
                <Button variant="outline" size="sm">Delete</Button>
              </form>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
