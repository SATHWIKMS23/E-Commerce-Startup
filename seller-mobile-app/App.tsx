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

        if (mounted) {
          setBootstrapped(true);
          setIsInitializing(false);
        }
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
