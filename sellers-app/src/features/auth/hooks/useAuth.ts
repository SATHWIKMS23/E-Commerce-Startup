'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut as nextAuthSignOut, signIn as nextAuthSignIn } from 'next-auth/react';
import { authApi } from '../api/authApi';
import { useRouter } from 'next/navigation';
import { useAuthBootstrapStore } from '@/lib/store/authBootstrapStore';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session, status } = useSession();
  const setBootstrapped = useAuthBootstrapStore((s) => s.setBootstrapped);

  // Sync session tokens to localStorage on sign-in
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated' && session) {
      if (session.backendToken) {
        localStorage.setItem('seller_token', session.backendToken);
      }
      if (session.backendRefreshToken) {
        localStorage.setItem('seller_refresh_token', session.backendRefreshToken);
      }
      setBootstrapped(true);
    } else {
      setBootstrapped(true);
    }
  }, [session, status, setBootstrapped]);

  // Profile Query: Single source of truth for auth state
  const profileQuery = useQuery({
    queryKey: ['profile'],
    enabled: status !== 'loading',
    queryFn: async () => {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('seller_token') : null;
      if (!storedToken && !session?.backendToken) {
        return null;
      }
      try {
        const res = await authApi.getProfile();
        return res.user;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      if (data.token) {
        localStorage.setItem('seller_token', data.token);
      }
      if (data.refreshToken) {
        localStorage.setItem('seller_refresh_token', data.refreshToken);
      }

      // Sync NextAuth session
      try {
        await nextAuthSignIn('credentials', {
          isDirectSync: 'true',
          userId: data.user.id,
          email: data.user.email,
          name: `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.username,
          backendToken: data.token,
          backendRefreshToken: data.refreshToken,
          redirect: false,
        });
      } catch {
        // NextAuth sync best-effort
      }

      // Clear all previous queries to avoid cache leaks across logins
      queryClient.clear();
      // Set query data directly and invalidate cache
      queryClient.setQueryData(['profile'], data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Invalidate dashboard and shop queries
      queryClient.invalidateQueries({ queryKey: ['shop'] });
      router.push('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: async (data) => {
      if (data.token) {
        localStorage.setItem('seller_token', data.token);
      }
      if (data.refreshToken) {
        localStorage.setItem('seller_refresh_token', data.refreshToken);
      }

      // Sync NextAuth session
      try {
        await nextAuthSignIn('credentials', {
          isDirectSync: 'true',
          userId: data.user.id,
          email: data.user.email,
          name: data.user.fullname,
          backendToken: data.token,
          backendRefreshToken: data.refreshToken,
          redirect: false,
        });
      } catch {
        // NextAuth sync best-effort
      }

      queryClient.clear();
      const firstName = data.user.fullname.split(' ')[0] || '';
      const lastName = data.user.fullname.split(' ').slice(1).join(' ') || '';
      queryClient.setQueryData(['profile'], {
        id: data.user.id,
        email: data.user.email,
        firstName,
        lastName,
        username: '',
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      router.push('/profile');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('seller_token');
      localStorage.removeItem('seller_refresh_token');
      try {
        await nextAuthSignOut({ redirect: false });
      } catch {
        // NextAuth session sign out
      }
      try {
        await authApi.logout();
      } catch {
        // Backend session may already be cleared
      }
    },
    onSuccess: () => {
      localStorage.removeItem('seller_token');
      localStorage.removeItem('seller_refresh_token');
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
      router.push('/login');
    },
    onError: () => {
      localStorage.removeItem('seller_token');
      localStorage.removeItem('seller_refresh_token');
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
      router.push('/login');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: authApi.deactivateAccount,
    onSuccess: async () => {
      localStorage.removeItem('seller_token');
      localStorage.removeItem('seller_refresh_token');
      try {
        await nextAuthSignOut({ redirect: false });
      } catch {
        // Ignore
      }
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
      router.push('/login');
    },
  });

  const resolvedUser = profileQuery.data ?? (session?.user ? {
    id: session.user.id,
    email: session.user.email || '',
    username: session.user.username || '',
    firstName: session.user.firstName || session.user.name?.split(' ')[0] || '',
    lastName: session.user.lastName || session.user.name?.split(' ').slice(1).join(' ') || '',
  } : null);

  return {
    user: resolvedUser,
    isAuthenticated: !!resolvedUser,
    isLoading: status === 'loading' || profileQuery.isLoading,
    isFetching: profileQuery.isFetching,

    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error as Error | null,

    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error as Error | null,

    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,

    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,

    deactivateAccount: deactivateMutation.mutateAsync,
    isDeactivating: deactivateMutation.isPending,
  };
}
