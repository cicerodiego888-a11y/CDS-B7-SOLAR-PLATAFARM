'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { AppShell } from '../layout/AppShell';
import { LoadingState } from '../ui/LoadingState';
import { useAuth } from './AuthProvider';

const PUBLIC_PATHS = ['/login'];

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) router.replace('/login');
    if (user && pathname === '/login') router.replace('/');
  }, [loading, user, isPublic, pathname, router]);

  if (isPublic) return <>{children}</>;
  if (loading || !user) {
    return (
      <div className="auth-loading">
        <LoadingState message="Carregando sessão..." />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
