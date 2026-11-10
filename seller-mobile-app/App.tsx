import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastContainer } from './src/shared/components/ToastContainer';
import { GlobalConfirmDialog } from './src/components/ui/GlobalConfirmDialog';
import { ComingSoonDialog } from './src/components/ui/ComingSoonDialog';
import { PremiumDialogContainer } from './src/components/ui/PremiumDialogContainer';
import { GuidelineAcceptanceModal } from './src/components/ui/GuidelineAcceptanceModal';

import { appStorage } from './src/lib/storage';
import { supabase } from './src/lib/supabase';
import axiosInstance from './src/lib/axios/axiosInstance';
import { useAuthBootstrapStore } from './src/lib/store/authBootstrapStore';
import { Colors } from './src/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const setBootstrapped = useAuthBootstrapStore((s) => s.setBootstrapped);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Preload AsyncStorage cache for synchronous header lookups
        await appStorage.preload();

        // Listen for Supabase session changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            try {
              const existingToken = appStorage.getItemSync('seller_token');
              if (!existingToken && session.access_token) {
                const userMetadata = (session.user.user_metadata || {}) as Record<string, any>;
                const fullName =
                  userMetadata.full_name ||
                  userMetadata.name ||
                  [userMetadata.given_name || '', userMetadata.family_name || '']
                    .filter(Boolean)
                    .join(' ')
                    .trim();
                const firstName =
                  userMetadata.given_name ||
                  userMetadata.first_name ||
                  fullName.split(' ')[0] ||
                  '';
                const lastName =
                  userMetadata.family_name ||
                  userMetadata.last_name ||
                  fullName.split(' ').slice(1).join(' ') ||
                  '';

                const syncRes = await axiosInstance.post('/seller/api/auth/google', {
                  accessToken: session.access_token,
                  idToken: (session as any).id_token || undefined,
                  provider: 'google',
                  providerId: session.user.id,
                  email: session.user.email,
                  name: fullName,
                  firstName,
                  lastName,
                  avatarUrl: userMetadata.avatar_url || userMetadata.picture || '',
                });

                if (syncRes.data?.token) {
                  await appStorage.setItem('seller_token', syncRes.data.token);
                }
                if (syncRes.data?.refreshToken) {
                  await appStorage.setItem('seller_refresh_token', syncRes.data.refreshToken);
                }

                queryClient.setQueryData(['profile'], syncRes.data.user);
                queryClient.invalidateQueries({ queryKey: ['profile'] });
                queryClient.invalidateQueries({ queryKey: ['shop'] });
              }
              setBootstrapped(true);
            } catch (syncErr) {
              console.warn('[auth:bootstrap] Google sync fallback:', syncErr);
              setBootstrapped(true);
            }
          } else if (event === 'SIGNED_OUT') {
            await appStorage.removeItem('seller_token');
            await appStorage.removeItem('seller_refresh_token');
            try {
              await axiosInstance.post('/seller/api/auth/logout');
            } catch {}
            queryClient.setQueryData(['profile'], null);
            queryClient.clear();
            setBootstrapped(true);
          } else {
            setBootstrapped(true);
          }
        });

        // Also check if existing token is stored to trigger bootstrap immediately
        const token = appStorage.getItemSync('seller_token');
        if (token) {
          setBootstrapped(true);
        }

        if (mounted) {
          setIsInitializing(false);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.warn('App initialization error:', err);
        if (mounted) {
          setBootstrapped(true);
          setIsInitializing(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [setBootstrapped]);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.purpleLight} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>

        {/* Global Overlays & Modals */}
        <ToastContainer />
        <GlobalConfirmDialog />
        <ComingSoonDialog />
        <PremiumDialogContainer />
        <GuidelineAcceptanceModal />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
