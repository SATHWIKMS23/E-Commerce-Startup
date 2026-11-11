'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { Loader2, Store } from 'lucide-react';

export function AuthCallbackPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth loading is complete and user is authenticated, redirect to dashboard
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fallback timer: if the authentication process hangs (e.g. 10 seconds), redirect back to login
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        console.warn('AuthCallbackPage: Authentication timed out. Redirecting to login...');
        router.push('/login');
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background text-foreground noise-bg py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Floating Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] orb-1 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] orb-2 pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full bg-pink-500/5 blur-[100px] orb-3 pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center space-y-6 animate-fade-up">
        {/* Portal Header Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-900/80 to-indigo-900/80 glass border border-purple-500/30 shadow-lg animate-pulse">
          <Store className="h-8 w-8 text-purple-400" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white text-gradient">Finishing Login</h1>
          <p className="text-xs text-white/50 tracking-wide uppercase font-semibold">Syncing your seller session</p>
        </div>

        {/* Progress Spinner */}
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
        </div>

        <p className="text-xs text-white/30 max-w-xs leading-relaxed">
          Please wait a moment while we retrieve your profile details and set up your seller workspace.
        </p>
      </div>
    </div>
  );
}
