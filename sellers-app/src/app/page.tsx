'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8 space-y-4">
      <span className="h-10 w-10 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
      <p className="text-sm text-white/40 font-medium">Loading seller portal...</p>
    </div>
  );
}
