'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Status = 'not_started' | 'in_progress' | 'done';

type TaskRow = {
  id: string;
  title: string;
  status: Status;
  notes: string | null;
  estimate_cost: number | null;
  actual_cost: number | null;
  created_at: string;
};

export default function TaskList({
  projectId,
  roomId,
  initialTasks,
  updateStatusAction,
  updateTaskAction,
  deleteTaskAction,
}: {
  projectId: string;
  roomId: string;
  initialTasks: TaskRow[];
  updateStatusAction: (formData: FormData) => void;
  updateTaskAction: (formData: FormData) => void;
  deleteTaskAction: (formData: FormData) => void;
}) {
  const [tasks, setTasks] = React.useState<TaskRow[]>(initialTasks);
  const [filter, setFilter] = React.useState<'all' | Status>('all');
  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => setTasks(initialTasks), [initialTasks]);

  const counts = React.useMemo(() => {
    const base = { all: tasks.length, not_started: 0, in_progress: 0, done: 0 };
    for (const t of tasks) base[t.status] += 1;
    return base;
  }, [tasks]);

  const filtered = tasks.filter((t) => (filter === 'all' ? true : t.status === filter));

  return (
    <div className="space-y-4">
      {/* Filters with counts */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'not_started', 'in_progress', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'rounded-md px-3 py-1.5 text-sm border transition',
              filter === f ? 'bg-muted font-semibold' : 'text-muted-foreground hover:bg-muted',
            ].join(' ')}
            type="button"
          >
            {labelFor(f)}{' '}
            <span className="opacity-70">
              ({f === 'all' ? counts.all : (counts as any)[f]})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No tasks match this filter.</div>
      ) : (
        <ul className="grid gap-2">
          {filtered.map((t) => {
            const isOpen = !!open[t.id];
            return (
              <li key={t.id} className="rounded-xl border p-3 md:p-4 bg-card card-elevated">
                {/* Top row: title + status control */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex-1 font-medium">{t.title}</div>

                  {/* 3-state status control (each posts immediately) */}
                  <div className="flex items-center gap-1">
                    <StatusButton current={t.status} target="not_started" label="Todo"
                      projectId={projectId} roomId={roomId} taskId={t.id} action={updateStatusAction} />
                    <StatusButton current={t.status} target="in_progress" label="In progress"
                      projectId={projectId} roomId={roomId} taskId={t.id} action={updateStatusAction} />
                    <StatusButton current={t.status} target="done" label="Done"
                      projectId={projectId} roomId={roomId} taskId={t.id} action={updateStatusAction} />
                  </div>
                </div>

                {/* Foldout details */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))}
                    className="text-sm underline text-muted-foreground hover:text-foreground"
                    aria-expanded={isOpen}
                    aria-controls={`task-${t.id}-details`}
                  >
                    {isOpen ? 'Hide details' : 'Edit details'}
                  </button>

                  {isOpen && (
                    <div id={`task-${t.id}-details`} className="mt-3 grid gap-2 sm:grid-cols-2">
                      {/* UPDATE form (title/notes/costs + Save) */}
                      <form action={updateTaskAction} className="contents">
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="room_id" value={roomId} />
                        <input type="hidden" name="task_id" value={t.id} />

                        <Input name="title" defaultValue={t.title} className="sm:col-span-2" />
                        <Input
                          name="estimate_cost"
                          type="number"
                          step="0.01"
                          placeholder="Estimate (kr)"
                          defaultValue={t.estimate_cost ?? ''}
                        />
                        <Input
                          name="actual_cost"
                          type="number"
                          step="0.01"
                          placeholder="Actual (kr)"
                          defaultValue={t.actual_cost ?? ''}
                        />
                        <Input name="notes" defaultValue={t.notes ?? ''} className="sm:col-span-2" placeholder="Notes" />

                        <div className="sm:col-span-2">
                          <Button variant="outline" size="sm">Save</Button>
                        </div>
                      </form>

                      {/* DELETE form (sibling, not nested) */}
                      <form action={deleteTaskAction} className="sm:col-span-2 flex justify-end">
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="room_id" value={roomId} />
                        <input type="hidden" name="task_id" value={t.id} />
                        <Button variant="outline" size="sm">Delete</Button>
                      </form>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function labelFor(f: 'all' | Status) {
  switch (f) {
    case 'all': return 'All';
    case 'not_started': return 'Not started';
    case 'in_progress': return 'In progress';
    case 'done': return 'Done';
  }
}

function StatusButton({
  current,
  target,
  label,
  projectId,
  roomId,
  taskId,
  action,
}: {
  current: Status;
  target: Status;
  label: string;
  projectId: string;
  roomId: string;
  taskId: string;
  action: (formData: FormData) => void;
}) {
  const active = current === target;
  return (
    <form action={action}>
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="room_id" value={roomId} />
      <input type="hidden" name="task_id" value={taskId} />
      <Button
        type="submit"
        variant={active ? 'default' : 'outline'}
        size="sm"
        name="status"
        value={target}
        className="text-xs"
        aria-pressed={active}
      >
        {label}
      </Button>
    </form>
  );
}
