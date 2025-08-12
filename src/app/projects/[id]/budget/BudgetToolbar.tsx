'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Room = { id: string; name: string | null };

export default function BudgetToolbar({
  rooms,
  initial,
}: {
  rooms: Room[];
  initial: {
    room: string;                // 'all' | 'unassigned' | <roomId>
    type: 'both' | 'budget' | 'task';
    q: string;
    sort: 'created' | 'name' | 'est' | 'act' | 'room' | 'type';
    dir: 'asc' | 'desc';
  };
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [room, setRoom] = React.useState(initial.room);
  const [type, setType] = React.useState<'both' | 'budget' | 'task'>(initial.type);
  const [q, setQ] = React.useState(initial.q);
  const [sort, setSort] = React.useState<'created' | 'name' | 'est' | 'act' | 'room' | 'type'>(initial.sort);
  const [dir, setDir] = React.useState<'asc' | 'desc'>(initial.dir);

  function push() {
    const params = new URLSearchParams();
    if (room && room !== 'all') params.set('room', room);
    if (type !== 'both') params.set('type', type);
    if (q.trim()) params.set('q', q.trim());
    if (sort !== 'created') params.set('sort', sort);
    if (dir !== 'asc') params.set('dir', dir);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // Auto-apply on select changes; search uses Apply/Reset
  React.useEffect(() => {
    // apply on selects (room/type/sort/dir) but not on q edits
    push();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, type, sort, dir]);

  function resetAll() {
    setRoom('all');
    setType('both');
    setQ('');
    setSort('created');
    setDir('asc');
    router.replace(pathname);
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border p-3 md:p-4 bg-card">
      {/* Room */}
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Room</span>
        <select
          className="h-9 rounded-md border bg-background px-2 min-w-[160px]"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        >
          <option value="all">All rooms</option>
          <option value="unassigned">Unassigned</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name ?? 'Untitled'}
            </option>
          ))}
        </select>
      </label>

   

      {/* Search */}
      <label className="grid gap-1 flex-1 min-w-[160px]">
        <span className="text-xs text-muted-foreground">Search</span>
        <input
          className="h-9 rounded-md border bg-background px-2"
          placeholder="Name contains…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>

      <div className="flex gap-2 ml-auto">
        <Button type="button" variant="outline" onClick={push}>
          Apply
        </Button>
        <Button type="button" variant="outline" onClick={resetAll}>
          Reset
        </Button>
      </div>
    </div>
  );
}
