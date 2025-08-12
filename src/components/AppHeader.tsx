import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export default async function AppHeader() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const Nav = () => (
    <nav className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition"
      >
        Dashboard
      </Link>
      <Link
        href="/projects"
        className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition"
      >
        Projects
      </Link>
    </nav>
  );

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container flex h-14 items-center gap-3">
        {/* Brand */}
        <Link href="/projects" className="mr-2 font-semibold">
          RenoPlan
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:block">
          <Nav />
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {/* Account menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">{user.email}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/logout?next=/marketing" className="w-full">
                  Sign out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" aria-label="Navigation">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Quick links to your dashboard and projects.</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-2">
                <div className="text-xs text-muted-foreground">Main</div>
                <div className="grid">
                  <SheetClose asChild>
                    <Link
                      href="/dashboard"
                      className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition"
                    >
                      Dashboard
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/projects"
                      className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition"
                    >
                      Projects
                    </Link>
                  </SheetClose>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <div className="text-xs text-muted-foreground">Account</div>
                <div className="grid">
                  <SheetClose asChild>
                    <Link
                      href="/logout?next=/marketing"
                      className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition"
                    >
                      Sign out
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
