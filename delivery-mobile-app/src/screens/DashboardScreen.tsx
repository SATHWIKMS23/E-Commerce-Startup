import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import * as Location from "expo-location";
import { Activity, ArrowRight, Bike, Clock3, History, LogOut, MapPin, Package, Power, Radio, Star, UserRound, Wallet } from "lucide-react-native";
import { apiClient, getErrorMessage, normalizeDelivery, normalizeRider } from "../api";
import { useAuth } from "../auth/AuthContext";
import { BrandHeader, Button, Card, currencyFromPaise, Loading, Metric, Page, Screen } from "../components/ui";
import { useDeliverySettings } from "../settings/DeliverySettingsContext";
import { colors } from "../theme";
import type { DashboardSummary, RootStackParamList, Rider } from "../types";

const emptySummary: DashboardSummary = {
  todayEarnings: 0,
  pendingEarnings: 0,
  todayCompletedCount: 0,
  totalCompletedCount: 0,
  pendingOffersCount: 0,
  activeStrikesCount: 0,
  activeDelivery: null,
};

export function DashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { rider, updateRider, signOut } = useAuth();
  const { settings } = useDeliverySettings();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      const [profileResponse, dashboardResponse] = await Promise.all([
        apiClient.get("/api/delivery/riders/me"),
        apiClient.get("/api/delivery/dashboard"),
      ]);
      const currentRider = normalizeRider(profileResponse.data?.rider);
      if (currentRider) await updateRider(currentRider);
      const payload = dashboardResponse.data;
      if (payload?.summary) {
        setSummary({
          ...emptySummary,
          ...payload.summary,
          activeDelivery: normalizeDelivery(payload.summary.activeDelivery),
        });
      } else {
        const earnings = payload?.earnings || {};
        setSummary({
          ...emptySummary,
          todayEarnings: Number(earnings.todayPaise ?? earnings.todayEarnings ?? 0),
          pendingEarnings: Number(earnings.pendingPayoutPaise ?? 0),
          totalCompletedCount: Number(payload?.rider?.completedDeliveriesCount ?? earnings.totalCompletedTrips ?? 0),
          pendingOffersCount: payload?.pendingOffer ? 1 : 0,
          activeStrikesCount: Number(payload?.rider?.strikeCount ?? 0),
          activeDelivery: normalizeDelivery(payload?.activeDelivery),
        });
      }
      setError("");
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not load rider dashboard."));
      if ((cause as { response?: { status?: number } })?.response?.status === 401) await signOut();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut, updateRider]);

  useEffect(() => {
    void fetchDashboard();
    const poll = setInterval(() => void fetchDashboard(), 15000);
    return () => clearInterval(poll);
  }, [fetchDashboard]);

  useEffect(() => {
    if (!rider?.isAvailable) return;
    let active = true;
    const publishLocation = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) return;
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        await apiClient.post("/api/delivery/location", {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      } catch (cause) {
        console.error("Could not update rider location.", cause);
      }
    };
    void publishLocation();
    const timer = setInterval(() => void publishLocation(), 30000);
    return () => { active = false; clearInterval(timer); };
  }, [rider?.isAvailable]);

  const toggleAvailability = async () => {
    if (!rider || toggling) return;
    if (!rider.isAvailable && settings?.isDeliveryServiceEnabled === false) {
      Alert.alert("Delivery service paused", "Operations has temporarily disabled the delivery service. You cannot go online right now.");
      return;
    }
    if (!rider.isAvailable && rider.verificationStatus !== "APPROVED") {
      Alert.alert("Verification pending", "Only approved riders can go online. Your account is still under review.");
      return;
    }
    setError("");
    setToggling(true);
    try {
      let coordinates: { latitude: number; longitude: number } | undefined;
      if (!rider.isAvailable) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          coordinates = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        }
      }
      const { data } = await apiClient.post("/api/delivery/availability", {
        isAvailable: !rider.isAvailable,
        ...coordinates,
      });
      if (data?.success === false) throw new Error(data?.message || "Could not update availability.");
      const updatedRider = normalizeRider(data?.rider, rider);
      await updateRider({
        ...rider,
        ...updatedRider,
        isAvailable: !rider.isAvailable,
      });
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not update availability."));
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <Loading label="Loading rider profile..." />;

  const isApproved = rider?.verificationStatus === "APPROVED";
  const activeDelivery = summary.activeDelivery;
  const riderName = rider?.firstName || "Rider";

  return (
    <Screen>
      <BrandHeader
        right={
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Profile" onPress={() => navigation.navigate("Profile")} style={styles.iconButton}><UserRound size={17} color={colors.muted} /></Pressable>
            <Pressable accessibilityLabel="Sign out" onPress={() => void signOut()} style={styles.iconButton}><LogOut size={16} color={colors.muted} /></Pressable>
          </View>
        }
      />
      <Page
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchDashboard(); }} tintColor={colors.foreground} />}
      >
        <View style={styles.greeting}>
          <View>
            <Text style={styles.eyebrow}>RIDER DASHBOARD</Text>
            <Text style={styles.greetingTitle}>Welcome back, {riderName}</Text>
            <Text style={styles.greetingSub}>{rider?.city || "Your district"} delivery fleet</Text>
          </View>
          <View style={[styles.statusDot, rider?.isAvailable && styles.statusOnline]} />
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!isApproved ? (
          <Card style={styles.warning}>
            <Text style={styles.bannerTitle}>Account Verification Pending</Text>
            <Text style={styles.bannerText}>Your status is {rider?.verificationStatus || "PENDING"}. The operations team is reviewing your rider details. Availability is enabled after approval.</Text>
          </Card>
        ) : null}
        {(!rider?.vehicleType || rider?.phone?.startsWith("G_")) ? (
          <Pressable onPress={() => navigation.navigate("CompleteProfile")}>
            <Card style={styles.incomplete}>
              <View style={styles.cardHeading}>
                <Bike size={18} color={colors.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Complete your rider details</Text>
                  <Text style={styles.bannerText}>Add your phone, vehicle and verification information to finish your profile.</Text>
                </View>
                <ArrowRight size={16} color={colors.foreground} />
              </View>
            </Card>
          </Pressable>
        ) : null}
        {summary.activeStrikesCount > 0 ? (
          <Pressable onPress={() => navigation.navigate("Profile")}>
            <Card style={styles.strike}>
              <Text style={styles.bannerTitle}>{summary.activeStrikesCount} active strike(s)</Text>
              <Text style={styles.bannerText}>Accounts with 3 strikes may be suspended. Review your profile to appeal.</Text>
            </Card>
          </Pressable>
        ) : null}

        <Card style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={[styles.statusDot, rider?.isAvailable && styles.statusOnline]} />
            <Text style={styles.eyebrow}>CURRENT STATUS</Text>
          </View>
          <Text style={styles.statusTitle}>{rider?.isAvailable ? "Online & Ready to Deliver" : "You are currently Offline"}</Text>
          <Text style={styles.bannerText}>
            {rider?.isAvailable ? `Your location is shared with dispatch. Offers in ${rider?.city || "your district"} will appear here.` : "Go online when you are ready to receive local delivery requests."}
          </Text>
          <Button
            title={rider?.isAvailable ? "Go Offline" : "Go Online"}
            variant={rider?.isAvailable ? "secondary" : "primary"}
            onPress={() => void toggleAvailability()}
            loading={toggling}
            disabled={!isApproved}
            icon={<Power size={16} color={rider?.isAvailable ? colors.foreground : colors.black} />}
          />
        </Card>

        {activeDelivery ? (
          <Card style={styles.activeCard}>
            <View style={styles.cardHeading}>
              <View style={styles.smallIcon}><Package size={17} color={colors.foreground} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>ACTIVE DELIVERY</Text>
                <Text style={styles.cardTitle}>#{activeDelivery.trackingNumber || activeDelivery.id.slice(0, 8)}</Text>
              </View>
            </View>
            <Text style={styles.bannerText}>Status: {activeDelivery.status?.replace(/_/g, " ")}</Text>
            <View style={styles.addressRow}><MapPin size={13} color={colors.muted} /><Text style={styles.addressText}>Pickup · {activeDelivery.pickupAddress}</Text></View>
            <View style={styles.addressRow}><MapPin size={13} color={colors.muted} /><Text style={styles.addressText}>Drop-off · {activeDelivery.dropoffAddress}</Text></View>
            <Button title="Continue Delivery" onPress={() => navigation.navigate("Delivery", { deliveryId: activeDelivery.id })} icon={<ArrowRight size={16} color={colors.black} />} />
          </Card>
        ) : null}
        {summary.pendingOffersCount > 0 && !activeDelivery ? (
          <Pressable onPress={() => navigation.navigate("Main", { screen: "Offers" } as never)}>
            <Card style={styles.offerBanner}>
              <Radio size={20} color={colors.foreground} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{summary.pendingOffersCount} new delivery offer(s)</Text>
                <Text style={styles.bannerText}>Review and accept before dispatch timer expires.</Text>
              </View>
              <ArrowRight size={17} color={colors.foreground} />
            </Card>
          </Pressable>
        ) : null}

        <View style={styles.metrics}>
          <Metric label="Today's Earnings" value={currencyFromPaise(summary.todayEarnings)} caption="Paid directly to bank" />
          <Metric label="Completed Today" value={String(summary.todayCompletedCount)} caption={`Lifetime: ${summary.totalCompletedCount}`} />
          <Metric label="Rating" value={rider?.ratingAverage ? Number(rider.ratingAverage).toFixed(1) : "5.0"} caption={`Based on ${rider?.ratingCount ?? 0} reviews`} />
          <Metric label="Vehicle" value={(rider?.vehicleType || "Two Wheeler").replace(/_/g, " ")} caption={rider?.city || "Operational fleet"} />
        </View>

        <View style={styles.quickLinks}>
          <QuickLink icon={<Radio size={18} color={colors.foreground} />} label="Delivery Offers" onPress={() => navigation.navigate("Main", { screen: "Offers" } as never)} />
          <QuickLink icon={<Wallet size={18} color={colors.foreground} />} label="Payout Ledger" onPress={() => navigation.navigate("Main", { screen: "Earnings" } as never)} />
          <QuickLink icon={<History size={18} color={colors.foreground} />} label="Past Orders" onPress={() => navigation.navigate("History")} />
          <QuickLink icon={<UserRound size={18} color={colors.foreground} />} label="My Profile" onPress={() => navigation.navigate("Profile")} />
        </View>
        <View style={styles.locationNote}>
          <MapPin size={14} color={colors.subtle} />
          <Text style={styles.locationText}>Location access is used only while you are online.</Text>
          <Activity size={13} color={colors.subtle} />
        </View>
      </Page>
    </Screen>
  );
}

function QuickLink({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickLink, pressed && { opacity: 0.75 }]}>
      {icon}
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 7 },
  iconButton: { width: 35, height: 35, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  greeting: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 2 },
  eyebrow: { color: colors.subtle, fontSize: 9, fontWeight: "700", letterSpacing: 0.9 },
  greetingTitle: { color: colors.foreground, fontSize: 20, fontWeight: "700", marginTop: 5, letterSpacing: -0.5 },
  greetingSub: { color: colors.muted, fontSize: 11, marginTop: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#52525b" },
  statusOnline: { backgroundColor: colors.green },
  error: { padding: 12, borderRadius: 12, backgroundColor: colors.redBg, color: colors.red, fontSize: 11, lineHeight: 16 },
  warning: { backgroundColor: colors.amberBg, borderColor: "rgba(245,158,11,0.2)", gap: 7 },
  incomplete: { backgroundColor: colors.blueBg, borderColor: "rgba(14,165,233,0.2)" },
  strike: { backgroundColor: colors.redBg, borderColor: "rgba(244,63,94,0.2)", gap: 7 },
  bannerTitle: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  bannerText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  statusCard: { gap: 11, padding: 19, borderRadius: 23 },
  statusTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusTitle: { color: colors.foreground, fontSize: 18, fontWeight: "700", letterSpacing: -0.35 },
  activeCard: { gap: 12 },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  smallIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.cardStrong, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  addressText: { flex: 1, color: "#d4d4d8", fontSize: 11, lineHeight: 17 },
  offerBanner: { flexDirection: "row", alignItems: "center", gap: 12 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  quickLinks: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  quickLink: { flexGrow: 1, flexBasis: "45%", alignItems: "center", gap: 10, paddingVertical: 15, paddingHorizontal: 10, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  quickLabel: { color: "#e4e4e7", fontSize: 10, fontWeight: "600", textAlign: "center" },
  locationNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 3 },
  locationText: { color: colors.subtle, fontSize: 9 },
});
