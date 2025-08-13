// src/app/auth/login/page.tsx
import LoginForm from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic'; // avoid prerender mismatch

function sanitizeNext(n?: string) {
  return n && n.startsWith('/') ? n : '/dashboard';
}

export default function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const nextPath = sanitizeNext(searchParams?.next);
  return <LoginForm nextPath={nextPath} />;
}
