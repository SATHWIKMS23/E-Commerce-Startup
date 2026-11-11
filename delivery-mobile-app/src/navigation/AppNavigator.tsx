import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { LandingScreen } from "../screens/LandingScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { CompleteProfileScreen } from "../screens/CompleteProfileScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { OffersScreen } from "../screens/OffersScreen";
import { ActiveScreen } from "../screens/ActiveScreen";
import { EarningsScreen } from "../screens/EarningsScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { SupportScreen } from "../screens/SupportScreen";
import { DeliveryScreen } from "../screens/DeliveryScreen";
import { MainTabs } from "./MainTabs";
import { colors } from "../theme";
import { DeliverySettingsProvider } from "../settings/DeliverySettingsContext";
import type { RootStackParamList } from "../types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.foreground,
    border: colors.border,
    primary: colors.white,
  },
};

function NavigationContent() {
  const { rider, isReady } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.foreground} />
        <Text style={styles.loadingText}>Preparing your rider app...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        {rider ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Delivery" component={DeliveryScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function AppNavigator() {
  return (
    <AuthProvider>
      <DeliverySettingsProvider>
        <NavigationContent />
      </DeliverySettingsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, gap: 12 },
  loadingText: { color: colors.muted, fontSize: 12 },
});
