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
import { Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export default async function AppHeader() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container flex h-14 items-center gap-3">
        {/* Brand */}
        <Link href="/dashboard" className="mr-2 font-semibold">
          RenoPlan
        </Link>

        {/* Desktop nav: only Dashboard */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition"
          >
            Dashboard
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/logout?next=/marketing">Sign out</Link>
          </Button>

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
                <SheetDescription>Quick links</SheetDescription>
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
                </div>
              </div>
              <div className="mt-6 space-y-2">
  <div className="text-xs text-muted-foreground">Appearance</div>
  <div className="pt-1">
    <ThemeToggle />
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
