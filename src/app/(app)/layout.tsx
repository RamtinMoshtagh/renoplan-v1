import { ReactNode } from 'react';
import AppHeader from '@/components/AppHeader';

export default function AppSectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <AppHeader />
      <main className="container py-6 flex-1">{children}</main>
    </div>
  );
}
