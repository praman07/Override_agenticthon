'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/features/auth/hooks/useAuth.js';

export default function ProtectedRoute({ children, requireAuth = true }) {
  const { isAuthenticated, isAuthChecked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthChecked) return;

    if (requireAuth && !isAuthenticated) {
      router.replace('/login');
    } else if (!requireAuth && isAuthenticated) {
      router.replace('/chat');
    }
  }, [isAuthChecked, isAuthenticated, requireAuth, router]);

  if (!isAuthChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-300 text-sm">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-4 shadow-xl">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <span>Restoring session...</span>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return children;
}
