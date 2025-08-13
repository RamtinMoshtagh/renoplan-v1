'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { nok } from '@/lib/numbers';
import { ProjectProgress } from '@/components/ProjectProgress';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';

type ProjectRow = {
  id: string;
  name: string | null;
  total_budget: number | null;
  progress?: number | null;
  created_at?: string | null;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeZone: 'Europe/Oslo',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
};

export default function ProjectsGrid({ projects }: { projects: ProjectRow[] }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'name' | 'budget'>('recent');

  const filtered = useMemo(() => {
    const base = projects.filter((p) =>
      (p.name ?? '').toLowerCase().includes(q.toLowerCase().trim())
    );
    switch (sort) {
      case 'name':
        return [...base].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      case 'budget':
        return [...base].sort(
          (a, b) => Number(b.total_budget ?? 0) - Number(a.total_budget ?? 0)
        );
      default:
        return [...base].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
        );
    }
  }, [projects, q, sort]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search projects…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-72"
            aria-label="Search projects"
          />
        </div>
        {/* optional: add a simple sort select if you want */}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          No projects match your search.
        </div>
      ) : (
        <ResponsiveGrid min={280} gap="1rem">
          {filtered.map((p) => (
            <Card key={p.id} interactive>
              <CardHeader className="border-0 pb-0">
                <CardTitle className="text-base truncate">
                  {p.name ?? p.id.slice(0, 6)}
                </CardTitle>
                <CardDescription className="text-xs">
                  {fmtDate(p.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Total budget</div>
                  <div className="text-lg font-semibold">
                    kr {nok(Number(p.total_budget ?? 0))}
                  </div>
                </div>
                <ProjectProgress percent={Number(p.progress ?? 0)} />
              </CardContent>
              <CardFooter className="flex gap-2 justify-end">
                <Link href={`/projects/${p.id}`} prefetch={false}>
                  <Button size="sm" aria-label={`Open project ${p.name ?? p.id.slice(0, 6)}`}>
                    Open
                  </Button>
                </Link>
                <Link href={`/projects/${p.id}/report`} prefetch={false}>
                  <Button size="sm" variant="outline" aria-label={`Open report for ${p.name ?? p.id.slice(0, 6)}`}>
                    Report
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </ResponsiveGrid>
      )}
    </div>
  );
}
