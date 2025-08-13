'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';

type ProjectHeaderProps = {
  projectId: string;
  projects?: { id: string; name: string | null }[];
};

export default function ProjectHeader({ projectId, projects = [] }: ProjectHeaderProps) {
  const pathname = usePathname();

  const tabs = [
    { href: `/projects/${projectId}`, label: 'Overview' },
    { href: `/projects/${projectId}/rooms`, label: 'Rooms' },
    { href: `/projects/${projectId}/budget`, label: 'Budget' },
    { href: `/projects/${projectId}/documents`, label: 'Documents' },
    { href: `/projects/${projectId}/report`, label: 'Report' },
    { href: `/projects/${projectId}/settings`, label: 'Settings' },
  ];

  const currentProject = projects.find((p) => p.id === projectId);
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container h-14 flex items-center gap-3">
        {/* Left: brand / current project */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" prefetch={false} className="font-semibold shrink-0">
            RenoPlan
          </Link>
          <div className="text-sm text-muted-foreground truncate">
            {currentProject?.name ?? 'Project'}
          </div>
        </div>

        {/* Desktop nav: Dashboard + tabs */}
        <nav className="ml-auto hidden md:flex items-center gap-2">
          <Link
            href="/dashboard"
            prefetch={false}
            className={cn(
              'rounded-md px-3 py-2 text-sm hover:bg-muted transition',
              pathname === '/dashboard' ? 'font-semibold bg-muted' : 'text-muted-foreground'
            )}
            aria-current={pathname === '/dashboard' ? 'page' : undefined}
          >
            Dashboard
          </Link>

          {tabs.map((t) => {
            const active = isActive(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                prefetch={false}
                className={cn(
                  'rounded-md px-3 py-2 text-sm hover:bg-muted transition',
                  active ? 'font-semibold bg-muted' : 'text-muted-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                {t.label}
              </Link>
            );
          })}

          <div className="flex items-center gap-2 ml-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
  <Link href="/auth/logout?next=/marketing" prefetch={false}>Sign out</Link>
</Button>
          </div>
        </nav>

        {/* Mobile: sheet menu */}
        <div className="ml-auto md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Open project menu">
                Menu
              </Button>
            </SheetTrigger>

            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Project menu</SheetTitle>
                <SheetDescription>
                  Switch projects and navigate to sections.
                </SheetDescription>
              </SheetHeader>

              {/* Project switcher */}
              {projects.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground mb-2">Projects</div>
                  <div className="grid gap-1">
                    {projects.map((p) => {
                      const href = `/projects/${p.id}`;
                      const active = isActive(href);
                      return (
                        <SheetClose asChild key={p.id}>
                          <Link
                            href={href}
                            prefetch={false}
                            className={cn(
                              'rounded-md px-3 py-2 text-sm hover:bg-muted transition',
                              p.id === projectId || active
                                ? 'font-semibold bg-muted'
                                : 'text-muted-foreground'
                            )}
                            aria-current={p.id === projectId || active ? 'page' : undefined}
                          >
                            {p.name ?? p.id.slice(0, 6)}
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigate */}
              <div className="mt-6">
                <div className="text-xs text-muted-foreground mb-2">Navigate</div>
                <div className="grid gap-1">
                  <SheetClose asChild>
                    <Link
                      href="/dashboard"
                      prefetch={false}
                      className={cn(
                        'rounded-md px-3 py-2 text-sm hover:bg-muted transition',
                        pathname === '/dashboard' ? 'font-semibold bg-muted' : 'text-muted-foreground'
                      )}
                      aria-current={pathname === '/dashboard' ? 'page' : undefined}
                    >
                      Dashboard
                    </Link>
                  </SheetClose>

                  {tabs.map((t) => {
                    const active = isActive(t.href);
                    return (
                      <SheetClose asChild key={t.href}>
                        <Link
                          href={t.href}
                          prefetch={false}
                          className={cn(
                            'rounded-md px-3 py-2 text-sm hover:bg-muted transition',
                            active ? 'font-semibold bg-muted' : 'text-muted-foreground'
                          )}
                          aria-current={active ? 'page' : undefined}
                        >
                          {t.label}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>
              </div>

              {/* Account / Sign out */}
              <div className="mt-6">
                <div className="text-xs text-muted-foreground mb-2">Account</div>
                <div className="grid">
                  <SheetClose asChild>
                    <Link
  href="/auth/logout?next=/marketing"
  prefetch={false}
  className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition"
>
  Sign out
</Link>
                  </SheetClose>
                </div>
              </div>

              {/* Appearance */}
              <div className="mt-6 space-y-2">
                <div className="text-xs text-muted-foreground">Appearance</div>
                <div className="pt-1">
                  <ThemeToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
