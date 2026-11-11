import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { ArrowRight, MapPin, Package } from "lucide-react-native";
import { apiClient, getErrorMessage, normalizeDelivery } from "../api";
import { Button, Card, Loading, Page, Screen, Title } from "../components/ui";
import { colors } from "../theme";
import type { Delivery, RootStackParamList } from "../types";

export function ActiveScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActive = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/delivery/jobs/active");
      setDelivery(normalizeDelivery(data?.activeDelivery));
      setError("");
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not load the active delivery."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchActive();
    const timer = setInterval(() => void fetchActive(), 10000);
    return () => clearInterval(timer);
  }, [fetchActive]);

  if (loading) return <Loading label="Checking active delivery..." />;

  return (
    <Screen>
      <Page>
        <Title subtitle="Current pickup, route and customer drop-off details.">Active Delivery</Title>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {delivery ? (
          <Card style={styles.card}>
            <View style={styles.heading}>
              <View style={styles.icon}><Package size={19} color={colors.foreground} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>DELIVERY #{delivery.trackingNumber || delivery.id.slice(0, 8)}</Text>
                <Text style={styles.title}>{delivery.status.replace(/_/g, " ")}</Text>
              </View>
              <Text style={styles.payout}>₹{((delivery.riderPayoutAmountPaise || 0) / 100).toFixed(2)}</Text>
            </View>
            <RoutePoint title="PICKUP" value={delivery.pickupAddress} />
            <RoutePoint title="DROP-OFF" value={delivery.dropoffAddress} />
            <Button title="Continue Delivery" onPress={() => navigation.navigate("Delivery", { deliveryId: delivery.id })} icon={<ArrowRight size={16} color={colors.black} />} />
          </Card>
        ) : (
          <Card style={styles.empty}>
            <View style={styles.icon}><Package size={22} color={colors.muted} /></View>
            <Text style={styles.title}>No active delivery</Text>
            <Text style={styles.description}>Accepted delivery jobs will appear here with pickup, route and drop-off details.</Text>
            <Pressable onPress={() => navigation.navigate("Main", { screen: "Offers" } as never)}>
              <Text style={styles.link}>View delivery offers</Text>
            </Pressable>
          </Card>
        )}
      </Page>
    </Screen>
  );
}

function RoutePoint({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.route}>
      <MapPin size={15} color={colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>{title}</Text>
        <Text style={styles.address}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  heading: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.cardStrong, borderColor: colors.borderStrong, borderWidth: 1 },
  eyebrow: { color: colors.subtle, fontSize: 9, fontWeight: "700", letterSpacing: 0.7 },
  title: { color: colors.foreground, fontSize: 15, fontWeight: "700", marginTop: 3 },
  payout: { color: colors.foreground, fontSize: 15, fontWeight: "700" },
  route: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  address: { color: "#d4d4d8", fontSize: 12, lineHeight: 18, marginTop: 4 },
  empty: { alignItems: "center", gap: 13, paddingVertical: 35 },
  description: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  link: { color: colors.foreground, fontSize: 12, fontWeight: "700", padding: 8 },
  error: { color: colors.red, backgroundColor: colors.redBg, padding: 12, borderRadius: 12, fontSize: 11 },
});
