import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Colors } from '@/theme/colors';

// Auth screens
import { LoginPage } from '@/features/auth/ui/LoginPage';
import { RegisterPage } from '@/features/auth/ui/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ui/ForgotPasswordPage';

// Main / Protected screens
import { DashboardPage } from '@/features/dashboard/ui/DashboardPage';
import { ProductListPage } from '@/features/products/ui/ProductListPage';
import { OrdersPage } from '@/features/orders/ui/OrdersPage';
import { OrderDetailPage } from '@/features/orders/ui/OrderDetailPage';
import { CustomOrdersPage } from '@/features/custom-orders/ui/CustomOrdersPage';
import { CustomOrderDetailPage } from '@/features/custom-orders/ui/CustomOrderDetailPage';
import { AnalyticsPage } from '@/features/analytics/ui/AnalyticsPage';
import { PayoutsPage } from '@/features/payouts/ui/PayoutsPage';
import { ReviewsPage } from '@/features/reviews/ui/ReviewsPage';
import { NotificationsPage } from '@/features/notifications/ui/NotificationsPage';
import { ShopSettingsPage } from '@/features/shop/ui/ShopSettingsPage';
import { ShopSetupPage } from '@/features/shop/ui/ShopSetupPage';
import { SellerProfilePage } from '@/features/profile/ui/SellerProfilePage';
import { SettingsPage } from '@/features/settings/ui/SettingsPage';
import { EnforcementPage } from '@/features/enforcement/ui/EnforcementPage';
import { PoliciesPage } from '@/features/policies/ui/PoliciesPage';
import { CommissionStatementsPage } from '@/features/commission/ui/CommissionStatementsPage';
import { SupportChatPage } from '@/features/support-chat/ui/SupportChatPage';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginPage} />
          <Stack.Screen name="Register" component={RegisterPage} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordPage} />
        </>
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={DashboardPage} />
          <Stack.Screen name="Products" component={ProductListPage} />
          <Stack.Screen name="Orders" component={OrdersPage} />
          <Stack.Screen name="OrderDetail" component={OrderDetailPage} />
          <Stack.Screen name="CustomOrders" component={CustomOrdersPage} />
          <Stack.Screen name="CustomOrderDetail" component={CustomOrderDetailPage} />
          <Stack.Screen name="Analytics" component={AnalyticsPage} />
          <Stack.Screen name="Payouts" component={PayoutsPage} />
          <Stack.Screen name="Reviews" component={ReviewsPage} />
          <Stack.Screen name="Notifications" component={NotificationsPage} />
          <Stack.Screen name="ShopSettings" component={ShopSettingsPage} />
          <Stack.Screen name="ShopSetup" component={ShopSetupPage} />
          <Stack.Screen name="SellerProfile" component={SellerProfilePage} />
          <Stack.Screen name="Settings" component={SettingsPage} />
          <Stack.Screen name="Enforcement" component={EnforcementPage} />
          <Stack.Screen name="Policies" component={PoliciesPage} />
          <Stack.Screen name="CommissionStatements" component={CommissionStatementsPage} />
          <Stack.Screen name="SupportChat" component={SupportChatPage} />
        </>
      )}
    </Stack.Navigator>
  );
}
