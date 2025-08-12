'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

type Project = { id: string; name: string | null };

export function ProjectSwitcher({
  currentId,
  projects,
}: {
  currentId: string;
  projects: Project[];
}) {
  const router = useRouter();

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Switch project</span>
      <select
        className="h-9 rounded-md border bg-background px-2 text-sm min-w-[200px]"
        value={currentId}
        onChange={(e) => router.push(`/projects/${e.target.value}`)}
        aria-label="Switch project"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name || p.id.slice(0, 6)}
          </option>
        ))}
      </select>
    </label>
  );
}
