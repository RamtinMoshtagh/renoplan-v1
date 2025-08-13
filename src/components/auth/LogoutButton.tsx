// src/components/auth/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const router = useRouter();

  async function onClick() {
    await fetch('/auth/signout', { method: 'POST', credentials: 'same-origin' });
    router.replace('/login');
  }

  return (
    <Button variant="outline" onClick={onClick}>
      Log out
    </Button>
  );
}
