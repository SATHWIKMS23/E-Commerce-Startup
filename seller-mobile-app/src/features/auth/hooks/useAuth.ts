import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { useAuthBootstrapStore } from '@/lib/store/authBootstrapStore';
import { appStorage } from '@/lib/storage';

function useAuthReady() {
  const [ready, setReady] = useState(false);
  const bootstrapped = useAuthBootstrapStore((s) => s.bootstrapped);

  useEffect(() => {
    if (bootstrapped && !ready) {
      setReady(true);
    }
  }, [bootstrapped, ready]);

  useEffect(() => {
    if (!bootstrapped && ready) {
      setReady(false);
    }
  }, [bootstrapped, ready]);

  return ready;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const authReady = useAuthReady();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    enabled: authReady,
    queryFn: async () => {
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
        await appStorage.setItem('seller_token', data.token);
      }
      if (data.refreshToken) {
        await appStorage.setItem('seller_refresh_token', data.refreshToken);
      }
      queryClient.clear();
      queryClient.setQueryData(['profile'], data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: authApi.googleLogin,
    onSuccess: async (data) => {
      if (data.token) {
        await appStorage.setItem('seller_token', data.token);
      }
      if (data.refreshToken) {
        await appStorage.setItem('seller_refresh_token', data.refreshToken);
      }
      queryClient.clear();
      queryClient.setQueryData(['profile'], data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: async (data) => {
      if (data.token) {
        await appStorage.setItem('seller_token', data.token);
      }
      if (data.refreshToken) {
        await appStorage.setItem('seller_refresh_token', data.refreshToken);
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
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await appStorage.removeItem('seller_token');
      await appStorage.removeItem('seller_refresh_token');
      try {
        await authApi.logout();
      } catch {
        // ignore backend session cleanup errors
      }
    },
    onSuccess: async () => {
      await appStorage.removeItem('seller_token');
      await appStorage.removeItem('seller_refresh_token');
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
    },
    onError: async () => {
      await appStorage.removeItem('seller_token');
      await appStorage.removeItem('seller_refresh_token');
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
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
      await appStorage.removeItem('seller_token');
      await appStorage.removeItem('seller_refresh_token');
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
    },
  });

  return {
    user: profileQuery.data ?? null,
    isAuthenticated: !!profileQuery.data,
    isLoading: !authReady || profileQuery.isLoading,
    isFetching: profileQuery.isFetching,

    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error as Error | null,

    googleLogin: googleLoginMutation.mutateAsync,
    isGoogleLoggingIn: googleLoginMutation.isPending,
    googleLoginError: googleLoginMutation.error as Error | null,

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
