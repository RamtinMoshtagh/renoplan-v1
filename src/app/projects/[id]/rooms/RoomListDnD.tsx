'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input'; // only needed if showEditControls is true

type Progress = { total: number; done: number; in_progress: number; not_started: number };
type ProgressMap = Record<string, Progress>;
type Room = { id: string; name: string; sort: number };

export function RoomListDnD({
  projectId,
  initialRooms,
  reorderAction,
  moveUpAction,
  moveDownAction,
  renameAction,
  deleteAction,
  showMoveButtons = false,
  showEditControls = false,
  progress: progressProp,
}: {
  projectId: string;
  initialRooms: Room[];
  reorderAction: (projectId: string, orderedIds: string[]) => Promise<void>;
  moveUpAction?: (formData: FormData) => void;
  moveDownAction?: (formData: FormData) => void;
  renameAction?: (formData: FormData) => void;
  deleteAction?: (formData: FormData) => void;
  showMoveButtons?: boolean;
  showEditControls?: boolean;
  progress?: ProgressMap;
}) {
  const progress: ProgressMap = progressProp ?? {};

  // Local state (sorted), and keep a ref so we can revert on failure
  const sortedInitial = React.useMemo(
    () => [...initialRooms].sort((a, b) => a.sort - b.sort),
    [initialRooms]
  );
  const [rooms, setRooms] = React.useState<Room[]>(sortedInitial);
  const prevRoomsRef = React.useRef<Room[]>(sortedInitial);

  // Keep local state in sync when initialRooms changes (e.g. after Add or server revalidate)
  React.useEffect(() => {
    prevRoomsRef.current = sortedInitial;
    setRooms(sortedInitial);
  }, [sortedInitial]);

  const [dragId, setDragId] = React.useState<string | null>(null);
  const dragging = React.useMemo(() => new Set([dragId].filter(Boolean) as string[]), [dragId]);

  function handleDragStart(id: string, e: React.DragEvent) {
    setDragId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(overId: string, e: React.DragEvent) {
    // Needed so onDrop/dragEnd fire and to allow reordering
    e.preventDefault();
    // Avoid dropping foreign content (e.g. files/text) into the card
    e.dataTransfer.dropEffect = 'move';

    if (!dragId || dragId === overId) return;

    const from = rooms.findIndex((r) => r.id === dragId);
    const to = rooms.findIndex((r) => r.id === overId);
    if (from === -1 || to === -1 || from === to) return;

    const next = [...rooms];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setRooms(next); // optimistic while dragging
  }

  async function handleDragEnd(e: React.DragEvent) {
    e.preventDefault();
    const orderedIds = rooms.map((r) => r.id);
    const snapshot = prevRoomsRef.current;

    setDragId(null);
    try {
      await reorderAction(projectId, orderedIds);
      // Persist the new order in the "last known good" snapshot
      prevRoomsRef.current = rooms;
    } catch (err) {
      console.error('Reorder failed', err);
      // Revert UI if the server update failed
      setRooms(snapshot);
    }
  }

  return (
    <ul
      role="list"
      className="auto-grid"
      style={{ ['--min-card' as any]: '280px' }}
      onDrop={(e) => e.preventDefault()}
    >
      {rooms.map((r, idx) => {
        const agg = progress[r.id] ?? { total: 0, done: 0, in_progress: 0, not_started: 0 };
        const pct = agg.total > 0 ? Math.round((agg.done / agg.total) * 100) : 0;

        return (
          <li
            role="listitem"
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
            {/* Clickable area */}
            <Link
              href={`/projects/${projectId}/rooms/${r.id}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium flex-1 truncate">{r.name}</span>

                {showMoveButtons && moveUpAction && moveDownAction ? (
                  <div className="flex items-center gap-1">
                    {/* Optional arrow buttons kept for a11y if ever enabled */}
                    <form action={moveUpAction}>
                      <input type="hidden" name="project_id" value={projectId} />
                      <input type="hidden" name="room_id" value={r.id} />
                      <input type="hidden" name="dir" value="up" />
                      <Button type="submit" variant="outline" size="sm" title="Move up" disabled={idx === 0}>
                        ↑
                      </Button>
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
                ) : null}
              </div>

              {/* Progress bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {agg.done}/{agg.total} done
                  </span>
                  <span>{pct}%</span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded bg-muted"
                  aria-label="Room completion"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  role="progressbar"
                >
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {agg.in_progress} in progress • {agg.not_started} not started
                </div>
              </div>
            </Link>

            {/* Edit block (hidden for this page) */}
            {showEditControls && renameAction && deleteAction ? (
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground underline">
                  Rename or delete
                </summary>
                {/* import Input above if you enable this block */}
                {/* ...rename/delete forms here if ever needed... */}
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
