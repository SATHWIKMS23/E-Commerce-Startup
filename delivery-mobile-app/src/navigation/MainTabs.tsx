import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Bike, CircleDollarSign, House, MessageSquare, Radio, Package } from "lucide-react-native";
import { DashboardScreen } from "../screens/DashboardScreen";
import { OffersScreen } from "../screens/OffersScreen";
import { ActiveScreen } from "../screens/ActiveScreen";
import { EarningsScreen } from "../screens/EarningsScreen";
import { SupportScreen } from "../screens/SupportScreen";
import { colors } from "../theme";
import type { MainTabParamList } from "../types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: { fontSize: 9, fontWeight: "600", marginBottom: 2 },
        tabBarStyle: {
          height: 62,
          paddingTop: 7,
          paddingBottom: 5,
          backgroundColor: "rgba(7,7,10,0.98)",
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color }) => {
          const iconProps = { size: 19, color };
          switch (route.name) {
            case "Home": return <House {...iconProps} />;
            case "Offers": return <Radio {...iconProps} />;
            case "Active": return <Package {...iconProps} />;
            case "Earnings": return <CircleDollarSign {...iconProps} />;
            default: return <MessageSquare {...iconProps} />;
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: "Home" }} />
      <Tab.Screen name="Offers" component={OffersScreen} options={{ tabBarLabel: "Offers" }} />
      <Tab.Screen name="Active" component={ActiveScreen} options={{ tabBarLabel: "Active" }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ tabBarLabel: "Earnings" }} />
      <Tab.Screen name="Support" component={SupportScreen} options={{ tabBarLabel: "Support" }} />
    </Tab.Navigator>
  );
}
