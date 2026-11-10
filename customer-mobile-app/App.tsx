import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrandingProvider } from './src/context/BrandingContext';
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { CartProvider } from './src/context/CartContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.foreground,
    border: colors.cardBorder,
    primary: colors.primary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <AuthProvider>
            <LocationProvider>
              <CartProvider>
                <NavigationContainer theme={navigationTheme}>
                  <StatusBar style="light" />
                  <AppNavigator />
                </NavigationContainer>
              </CartProvider>
            </LocationProvider>
          </AuthProvider>
        </BrandingProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
