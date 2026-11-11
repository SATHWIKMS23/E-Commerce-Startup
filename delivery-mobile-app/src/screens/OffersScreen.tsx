import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { Clock3, MapPin, Radio, Store, UserRound, X } from "lucide-react-native";
import { apiClient, getErrorMessage, normalizeDelivery } from "../api";
import { RouteMap } from "../components/RouteMap";
import { Button, Card, Loading, Page, Screen, Title, currencyFromPaise } from "../components/ui";
import { colors } from "../theme";
import type { Offer, RootStackParamList } from "../types";

function normalizeOffer(raw: Record<string, unknown>): Offer | null {
  const nested = raw.delivery && typeof raw.delivery === "object" ? raw.delivery as Record<string, unknown> : null;
  const id = String(raw.deliveryId || nested?.id || "");
  if (!id) return null;
  const delivery = nested || raw;
  const normalizedDelivery = normalizeDelivery({
    ...delivery,
    id,
    trackingNumber: delivery.trackingNumber || delivery.deliveryNumber,
    pickupAddress: delivery.pickupAddress,
    dropoffAddress: delivery.dropoffAddress,
    riderPayoutAmountPaise: delivery.riderPayoutAmountPaise || delivery.riderPayoutPaise,
    durationMins: delivery.durationMins || delivery.estimatedDurationMins,
  });
  if (!normalizedDelivery) return null;
  return {
    assignmentId: String(raw.assignmentId || raw.id || id),
    deliveryId: id,
    expiresAt: String(raw.expiresAt || delivery.expiresAt || ""),
    delivery: {
      ...normalizedDelivery,
      totalAmountPaise: Number(delivery.totalAmountPaise || delivery.totalDeliveryFeePaise || delivery.deliveryFeePaise || 0),
    },
  };
}

export function OffersScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const fetchOffers = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/delivery/offers");
      const items = Array.isArray(data?.offers) ? data.offers as Record<string, unknown>[] : [];
      setOffers(items.map(normalizeOffer).filter((offer): offer is Offer => offer !== null));
      setError("");
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not load delivery offers."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOffers();
    const poll = setInterval(() => void fetchOffers(), 4000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [fetchOffers]);

  const actOnOffer = async (offer: Offer, action: "accept" | "reject") => {
    setActingId(offer.deliveryId);
    setError("");
    try {
      const { data } = await apiClient.post(`/api/delivery/jobs/${offer.deliveryId}/${action}`);
      if (action === "accept" && (data?.success || data?.delivery)) {
        navigation.navigate("Delivery", { deliveryId: offer.deliveryId });
      } else {
        await fetchOffers();
      }
    } catch (cause) {
      setError(getErrorMessage(cause, action === "accept" ? "Could not accept this offer." : "Could not decline this offer."));
      await fetchOffers();
    } finally {
      setActingId(null);
    }
  };

  if (loading) return <Loading label="Scanning for active offers..." />;

  return (
    <Screen>
      <Page>
        <View style={styles.heading}>
          <View style={styles.icon}><Radio size={18} color={colors.foreground} /></View>
          <View style={{ flex: 1 }}>
            <Title subtitle="Accept a nearby job before its dispatch timer expires.">Live Dispatch Radar</Title>
          </View>
          <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {offers.length === 0 ? (
          <Card style={styles.empty}>
            <View style={styles.radar}><Radio size={24} color={colors.foreground} /></View>
            <Text style={styles.emptyTitle}>Searching for jobs near you...</Text>
            <Text style={styles.emptyText}>Stay online with location enabled. New dispatch offers appear here as soon as they are assigned.</Text>
            <Text style={styles.polling}>Checking for offers automatically</Text>
          </Card>
        ) : offers.map((offer) => {
          const secondsLeft = Math.max(0, Math.ceil((new Date(offer.expiresAt).getTime() - now) / 1000));
          const expired = !Number.isFinite(secondsLeft) || secondsLeft <= 0;
          return (
            <Card key={offer.assignmentId} style={[styles.offer, expired && styles.expired]}>
              <View style={styles.countdown}>
                <Clock3 size={14} color={expired ? colors.red : colors.muted} />
                <Text style={[styles.countdownText, expired && { color: colors.red }]}>{expired ? "Offer expired" : `${secondsLeft}s remaining`}</Text>
                <Text style={styles.order}>#{offer.delivery.trackingNumber}</Text>
              </View>
              <View style={styles.payoutCard}>
                <View>
                  <Text style={styles.eyebrow}>ESTIMATED RIDER PAYOUT</Text>
                  <Text style={styles.amount}>{currencyFromPaise(offer.delivery.riderPayoutAmountPaise)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.eyebrow}>EST. DISTANCE</Text>
                  <Text style={styles.distance}>{offer.delivery.distanceKm ? `${offer.delivery.distanceKm} km` : "3–5 km"}</Text>
                  <Text style={styles.duration}>~{offer.delivery.durationMins || 15} mins</Text>
                </View>
              </View>
              <RouteMap
                pickupAddress={offer.delivery.pickupAddress}
                dropoffAddress={offer.delivery.dropoffAddress}
                distanceKm={offer.delivery.distanceKm}
                durationMins={offer.delivery.durationMins}
                toPickup
                pickupUrl={offer.delivery.pickupNavigationUrl}
                dropoffUrl={offer.delivery.dropoffNavigationUrl}
              />
              <RouteCard icon={<Store size={15} color={colors.muted} />} label="PICKUP STORE / SELLER" value={offer.delivery.pickupAddress || "Partner Store"} contact={offer.delivery.pickupContactName} />
              <RouteCard icon={<UserRound size={15} color={colors.muted} />} label="DROPOFF CUSTOMER" value={offer.delivery.dropoffAddress || "Customer address"} contact={offer.delivery.dropoffContactName} />
              <Button title={actingId === offer.deliveryId ? "Accepting Job..." : "Accept Delivery Job"} onPress={() => void actOnOffer(offer, "accept")} disabled={expired || actingId !== null} loading={actingId === offer.deliveryId} />
              <Button title="Decline Offer" variant="secondary" icon={<X size={15} color={colors.muted} />} onPress={() => Alert.alert("Decline delivery?", "This offer will be returned to dispatch.", [{ text: "Keep offer", style: "cancel" }, { text: "Decline", style: "destructive", onPress: () => void actOnOffer(offer, "reject") }])} disabled={expired || actingId !== null} />
            </Card>
          );
        })}
      </Page>
    </Screen>
  );
}

function RouteCard({ icon, label, value, contact }: { icon: React.ReactNode; label: string; value: string; contact?: string }) {
  return (
    <View style={styles.route}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>{label}</Text>
        {contact ? <Text style={styles.contact}>{contact}</Text> : null}
        <View style={styles.addressRow}><MapPin size={11} color={colors.subtle} /><Text style={styles.address}>{value}</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  live: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 30, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { color: colors.muted, fontSize: 8, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 42, gap: 14 },
  radar: { width: 68, height: 68, borderRadius: 34, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.cardStrong, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: colors.foreground, fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: "center" },
  polling: { color: colors.subtle, fontSize: 10 },
  error: { padding: 12, borderRadius: 12, backgroundColor: colors.redBg, color: colors.red, fontSize: 11 },
  offer: { gap: 14, padding: 16 },
  expired: { opacity: 0.62 },
  countdown: { flexDirection: "row", alignItems: "center", gap: 7 },
  countdownText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  order: { flex: 1, color: colors.subtle, fontSize: 9, textAlign: "right", fontVariant: ["tabular-nums"] },
  payoutCard: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: colors.border },
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "600", letterSpacing: 0.5 },
  amount: { color: colors.foreground, fontSize: 22, fontWeight: "700", marginTop: 4 },
  distance: { color: colors.foreground, fontSize: 14, fontWeight: "700", marginTop: 4 },
  duration: { color: colors.subtle, fontSize: 9, marginTop: 3 },
  route: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: colors.border },
  contact: { color: colors.foreground, fontSize: 11, fontWeight: "600", marginTop: 4 },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 5 },
  address: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 15 },
});
