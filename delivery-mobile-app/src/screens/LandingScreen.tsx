import React from "react";
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowRight, Clock3, MapPin, ShieldCheck, Sparkles, Wallet } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo, Card, Page, Screen } from "../components/ui";
import { useDeliverySettings } from "../settings/DeliverySettingsContext";
import { colors } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Landing">;

const defaultStats = [
  { value: "~90%", label: "Rider Payout", desc: "Direct earnings share" },
  { value: "₹0 Free", label: "Registration Fee", desc: "No upfront fees" },
  { value: "Bikes & EVs", label: "Vehicles", desc: "Bicycles welcome" },
];

export function LandingScreen({ navigation }: Props) {
  const { settings, refresh } = useDeliverySettings();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const hero = settings?.hero;
  const statCards = settings?.cards;
  const registrationEnabled = settings?.isDeliveryServiceEnabled !== false;
  const openRegistration = () => {
    if (!registrationEnabled) {
      Alert.alert("Registration paused", "Rider registration is temporarily paused by delivery operations.");
      return;
    }
    navigation.navigate("Register");
  };
  const stats: Array<{ value: string; label: string; desc: string }> = [];
  if (statCards?.payout?.show !== false) stats.push({
      value: statCards?.payout?.value || defaultStats[0].value,
      label: statCards?.payout?.label || defaultStats[0].label,
      desc: statCards?.payout?.desc || defaultStats[0].desc,
    });
  if (statCards?.city?.show !== false) stats.push({
      value: statCards?.city?.value || (
        settings?.activeCities?.length === 1
          ? settings.activeCities[0]
          : settings?.activeCities?.length
            ? `${settings.activeCities.length} Districts`
            : "0 Districts"
      ),
      label: statCards?.city?.label || "Active Coverage",
      desc: statCards?.city?.desc || settings?.activeCities?.slice(0, 3).join(", ") || "Admin-enabled zones",
    });
  if (statCards?.fee?.show !== false) stats.push({
      value: statCards?.fee?.value || defaultStats[1].value,
      label: statCards?.fee?.label || defaultStats[1].label,
      desc: statCards?.fee?.desc || defaultStats[1].desc,
    });
  if (statCards?.vehicles?.show !== false) stats.push({
      value: statCards?.vehicles?.value || defaultStats[2].value,
      label: statCards?.vehicles?.label || "Vehicles",
      desc: statCards?.vehicles?.desc || defaultStats[2].desc,
    });

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate("Landing")} style={styles.brand}>
          <BrandLogo size={28} />
          <Text numberOfLines={1} style={styles.brandTitle}>{settings?.brandName || "AtlasBasket Delivery"}</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Login")} style={styles.loginLink}>
            <Text style={styles.loginText}>Log In</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={openRegistration} style={[styles.registerLink, !registrationEnabled && styles.disabledButton]}>
            <Text style={styles.registerText}>Register</Text>
          </Pressable>
        </View>
      </View>
      <Page contentContainerStyle={styles.content}>
        <View style={[styles.heroSection, { minHeight: Math.max(0, windowHeight - insets.top - insets.bottom - 56) }]}>
          <View style={styles.heroContent}>
            <View style={styles.hero}>
              <View style={styles.badge}>
                <Sparkles size={13} color={colors.muted} />
                <Text style={styles.badgeText}>{hero?.badge || "Local Delivery Network"}</Text>
              </View>
              <Text style={styles.heading}>
                {hero?.line1 || "Deliver locally."}{" "}
                <Text style={styles.headingMuted}>{hero?.line2 || "Earn directly with every trip."}</Text>
              </Text>
              <Text style={styles.description}>
                {hero?.description || "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in admin-enabled operational districts. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts."}
              </Text>
              <Pressable accessibilityRole="button" onPress={openRegistration} style={({ pressed }) => [styles.heroButton, styles.primaryHeroButton, pressed && styles.pressed, !registrationEnabled && styles.disabledButton]}>
                <Text style={styles.primaryHeroButtonText}>Register as a Rider</Text>
                <ArrowRight size={14} color={colors.black} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Login")} style={({ pressed }) => [styles.heroButton, styles.secondaryHeroButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryHeroButtonText}>Rider Sign In</Text>
              </Pressable>
              {!registrationEnabled ? <Text style={styles.registrationPaused}>Rider registration is temporarily paused by delivery operations.</Text> : null}
            </View>
            <View style={styles.stats}>
              {stats.map((item) => (
                <Card key={item.label} style={styles.statCard}>
                  <Text numberOfLines={1} style={styles.statValue}>{item.value}</Text>
                  <Text numberOfLines={1} style={styles.statLabel}>{item.label}</Text>
                  <Text numberOfLines={1} style={styles.statDesc}>{item.desc}</Text>
                </Card>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.featuresSection}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why Deliver with AtlasBasket?</Text>
            <Text style={styles.sectionSub}>
              Built specifically for local riders and neighborhood merchants in {settings?.activeCities?.join(", ") || ""}.
            </Text>
          </View>
          <Card style={styles.feature}>
            <Wallet size={19} color={colors.foreground} />
            <Text style={styles.featureTitle}>Direct Weekly Payouts</Text>
            <Text style={styles.featureSub}>Earn the majority share on every delivery with zero hidden platform cut. Earnings are disbursed automatically to your registered bank account.</Text>
          </Card>
          <Card style={styles.feature}>
            <Clock3 size={19} color={colors.foreground} />
            <Text style={styles.featureTitle}>Flexible Shifts</Text>
            <Text style={styles.featureSub}>Toggle Online when you want to deliver, and Go Offline when you are done. No minimum mandatory hours or penalty for logging off.</Text>
          </Card>
          <Card style={styles.feature}>
            <ShieldCheck size={19} color={colors.foreground} />
            <Text style={styles.featureTitle}>Secure OTP Verification</Text>
            <Text style={styles.featureSub}>Every pickup and drop-off is cryptographically validated with merchant QR and customer OTPs, ensuring accurate delivery credit.</Text>
          </Card>
          <Card style={styles.zones}>
            <Text style={styles.zonesTitle}>Active Operational Zones ({settings?.activeCities?.length || 0} Enabled Districts)</Text>
            {settings?.activeCities?.length ? (
              <View style={styles.cityList}>
                {settings.activeCities.map((city) => (
                  <View key={city} style={styles.cityChip}>
                    <MapPin size={12} color={colors.muted} />
                    <Text style={styles.cityText}>{city}</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={styles.featureSub}>No districts currently enabled by admin in the database.</Text>}
            <Pressable accessibilityRole="button" onPress={openRegistration} style={[styles.applyButton, !registrationEnabled && styles.disabledButton]}>
              <Text style={styles.applyButtonText}>{settings?.activeCities?.length ? `Apply in ${settings.activeCities[0]}` : "Apply to Deliver"}</Text>
            </Pressable>
          </Card>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>{settings?.brandName || "AtlasBasket Delivery"} · {settings?.activeCities?.length ? `${settings.activeCities.join(", ")} Network` : "Delivery Network"}</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Login")}><Text style={styles.footerLink}>Rider Portal</Text></Pressable>
        </View>
      </Page>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 34, gap: 24 },
  header: { height: 56, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "rgba(7,7,10,0.96)" },
  brand: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  brandTitle: { flexShrink: 1, color: colors.foreground, fontSize: 12, fontWeight: "700", letterSpacing: -0.2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  loginLink: { paddingHorizontal: 8, paddingVertical: 8 },
  loginText: { color: colors.foreground, fontSize: 10, fontWeight: "500" },
  registerLink: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.white },
  registerText: { color: colors.black, fontSize: 10, fontWeight: "600" },
  heroSection: { justifyContent: "space-between", paddingVertical: 24 },
  heroContent: { flex: 1, justifyContent: "space-between", gap: 24 },
  hero: { alignItems: "center", gap: 16, paddingTop: 8, paddingBottom: 4, marginVertical: "auto" },
  badge: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 30, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.cardStrong, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: "#d4d4d8", fontSize: 10, fontWeight: "500" },
  heading: { color: colors.foreground, fontSize: 24, fontWeight: "700", lineHeight: 28, letterSpacing: -0.6, textAlign: "center" },
  headingMuted: { color: colors.muted, fontWeight: "500" },
  description: { paddingHorizontal: 4, color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: "center" },
  heroButton: { width: "100%", maxWidth: 240, minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingHorizontal: 20 },
  primaryHeroButton: { backgroundColor: colors.white },
  primaryHeroButtonText: { color: colors.black, fontSize: 12, fontWeight: "600" },
  secondaryHeroButton: { backgroundColor: colors.cardStrong, borderWidth: 1, borderColor: colors.borderStrong },
  secondaryHeroButtonText: { color: colors.foreground, fontSize: 12, fontWeight: "500" },
  pressed: { opacity: 0.8 },
  disabledButton: { opacity: 0.45 },
  registrationPaused: { color: colors.muted, fontSize: 10, textAlign: "center" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 16, paddingBottom: 8 },
  statCard: { flexBasis: "47%", flexGrow: 1, padding: 12, borderRadius: 12, gap: 2 },
  statValue: { color: colors.foreground, fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  statLabel: { color: "#d4d4d8", fontSize: 11, fontWeight: "500" },
  statDesc: { color: colors.subtle, fontSize: 10 },
  featuresSection: { gap: 16, paddingHorizontal: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  section: { alignItems: "center", gap: 8, paddingTop: 32, paddingBottom: 8 },
  sectionTitle: { color: colors.foreground, fontSize: 24, fontWeight: "700", letterSpacing: -0.5, textAlign: "center" },
  sectionSub: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: "center" },
  feature: { gap: 12, padding: 20, borderRadius: 16 },
  featureTitle: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  featureSub: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  zones: { gap: 14, padding: 20, borderRadius: 16 },
  zonesTitle: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  cityList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cityChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.cardStrong },
  cityText: { color: colors.foreground, fontSize: 11, fontWeight: "500" },
  applyButton: { alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white },
  applyButtonText: { color: colors.black, fontSize: 11, fontWeight: "600" },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 20, borderTopWidth: 1, borderTopColor: colors.border },
  footerBrand: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  footerLink: { color: colors.muted, fontSize: 10 },
});
