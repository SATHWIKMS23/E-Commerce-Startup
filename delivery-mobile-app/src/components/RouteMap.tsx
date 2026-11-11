import React from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Compass, MapPin, Navigation, Store, UserRound } from "lucide-react-native";
import { colors } from "../theme";

export function RouteMap({
  pickupAddress,
  dropoffAddress,
  distanceKm,
  durationMins,
  toPickup,
  pickupUrl,
  dropoffUrl,
}: {
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm?: number;
  durationMins?: number;
  toPickup: boolean;
  pickupUrl?: string;
  dropoffUrl?: string;
}) {
  const destination = toPickup ? pickupAddress : dropoffAddress;
  const targetName = toPickup ? "Pickup Location" : "Customer Location";
  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  const url = (toPickup ? pickupUrl : dropoffUrl) || fallback;

  const openMaps = async () => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Could not open delivery navigation.", error);
      Alert.alert("Navigation unavailable", "Could not open directions for this delivery.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.canvas}>
        <Svg viewBox="0 0 360 180" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          <Path d="M0 30H360M0 60H360M0 90H360M0 120H360M0 150H360M45 0V180M90 0V180M135 0V180M180 0V180M225 0V180M270 0V180M315 0V180" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
          <Path d="M54 126 Q132 30 205 92 T322 52" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2.5" strokeDasharray="6 6" />
          <Circle cx="54" cy="126" r="4" fill="#f4f4f5" />
          <Circle cx="322" cy="52" r="4" fill="#f4f4f5" />
        </Svg>
        <View style={styles.mapBadge}>
          <View style={styles.mapLive} />
          <Text style={styles.mapBadgeText}>Live Navigation Route</Text>
        </View>
        <View style={styles.pickupMarker}>
          <View style={styles.marker}><Store size={14} color={colors.foreground} /></View>
          <Text style={styles.markerLabel}>Pickup</Text>
        </View>
        <View style={styles.dropoffMarker}>
          <View style={styles.marker}><UserRound size={14} color={colors.foreground} /></View>
          <Text style={styles.markerLabel}>Customer</Text>
        </View>
        <View style={styles.eta}>
          <Compass size={13} color={colors.muted} />
          <Text style={styles.etaText}>{distanceKm || 3.5} km · ~{durationMins || 15} mins</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.target}>
          <View style={styles.targetLabel}>
            <MapPin size={12} color={colors.muted} />
            <Text style={styles.targetText}>TARGET: {targetName}</Text>
          </View>
          <Text numberOfLines={1} style={styles.address}>{destination}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void openMaps()} style={({ pressed }) => [styles.navigate, pressed && { opacity: 0.8 }]}>
          <Navigation size={13} color={colors.black} />
          <Text style={styles.navigateText}>Navigate</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  canvas: { height: 174, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.02)" },
  mapBadge: { position: "absolute", left: 10, top: 10, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(0,0,0,0.62)", borderWidth: 1, borderColor: colors.borderStrong },
  mapLive: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.foreground },
  mapBadgeText: { color: colors.foreground, fontSize: 9, fontWeight: "600" },
  pickupMarker: { position: "absolute", left: "12%", top: "48%", alignItems: "center", gap: 4 },
  dropoffMarker: { position: "absolute", right: "12%", top: "16%", alignItems: "center", gap: 4 },
  marker: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  markerLabel: { overflow: "hidden", borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: "rgba(0,0,0,0.68)", color: "#d4d4d8", fontSize: 8, fontWeight: "700" },
  eta: { position: "absolute", right: 9, bottom: 9, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: "rgba(0,0,0,0.7)", borderWidth: 1, borderColor: colors.border },
  etaText: { color: colors.foreground, fontSize: 9, fontWeight: "600" },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "rgba(255,255,255,0.02)" },
  target: { flex: 1, gap: 5 },
  targetLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  targetText: { color: "#d4d4d8", fontSize: 8, fontWeight: "700", letterSpacing: 0.5 },
  address: { color: colors.muted, fontSize: 9 },
  navigate: { minHeight: 37, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 11, paddingHorizontal: 12, backgroundColor: colors.white },
  navigateText: { color: colors.black, fontSize: 10, fontWeight: "700" },
});
