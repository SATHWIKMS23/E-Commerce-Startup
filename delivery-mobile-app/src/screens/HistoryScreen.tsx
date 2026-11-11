import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { CheckCircle2, Clock3, MapPin, XCircle } from "lucide-react-native";
import { apiClient, getErrorMessage, normalizeDelivery } from "../api";
import { Button, Card, Loading, Page, Screen, Title, currencyFromPaise } from "../components/ui";
import { colors } from "../theme";
import type { Delivery, RootStackParamList } from "../types";

type HistoryStatus = "ALL" | "COMPLETED" | "CANCELLED";

export function HistoryScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filter, setFilter] = useState<HistoryStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const fetchHistory = async () => {
    try {
      const { data } = await apiClient.get("/api/delivery/history?limit=50");
      const items: unknown[] = Array.isArray(data?.deliveries) ? data.deliveries : [];
      setDeliveries(items
        .map((item) => normalizeDelivery(item))
        .filter((delivery): delivery is Delivery => delivery !== null)
      );
      setError("");
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not load delivery history."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchHistory(); }, []);

  const filtered = useMemo(() => deliveries.filter((delivery) => {
    if (filter === "COMPLETED") return delivery.status === "COMPLETED" || delivery.status === "DELIVERED";
    if (filter === "CANCELLED") return delivery.status === "CANCELLED" || delivery.status === "FAILED";
    return true;
  }), [deliveries, filter]);

  const openTimeline = async (delivery: Delivery) => {
    setSelected(delivery);
    setLoadingEvents(true);
    try {
      const { data } = await apiClient.get(`/api/delivery/jobs/${delivery.id}/timeline`);
      setEvents(Array.isArray(data?.events) ? data.events as Record<string, unknown>[] : []);
    } catch (cause) {
      setEvents([]);
      setError(getErrorMessage(cause, "Could not load delivery timeline."));
    } finally {
      setLoadingEvents(false);
    }
  };

  if (loading) return <Loading label="Loading delivery history..." />;

  return (
    <Screen>
      <Page>
        <Title subtitle="A record of all your deliveries and trip details.">Delivery History</Title>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.filters}>
          {(["ALL", "COMPLETED", "CANCELLED"] as const).map((value) => (
            <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterSelected]}>
              <Text style={[styles.filterText, filter === value && styles.filterTextSelected]}>{value === "ALL" ? "All" : value === "COMPLETED" ? "Completed" : "Cancelled"}</Text>
            </Pressable>
          ))}
        </View>
        {filtered.length === 0 ? (
          <Card style={styles.empty}>
            <Clock3 size={24} color={colors.subtle} />
            <Text style={styles.emptyTitle}>No delivery trips found</Text>
            <Text style={styles.emptyText}>Completed and cancelled delivery jobs will appear here.</Text>
          </Card>
        ) : filtered.map((delivery) => (
          <Pressable key={delivery.id} onPress={() => void openTimeline(delivery)}>
            <Card style={styles.delivery}>
              <View style={styles.deliveryHeading}>
                {delivery.status === "COMPLETED" || delivery.status === "DELIVERED" ? <CheckCircle2 size={17} color={colors.green} /> : <XCircle size={17} color={colors.muted} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.order}>#{delivery.trackingNumber || delivery.id.slice(0, 8)}</Text>
                  <Text style={styles.status}>{delivery.status.replace(/_/g, " ")}</Text>
                </View>
                <Text style={styles.amount}>{currencyFromPaise(delivery.riderPayoutAmountPaise)}</Text>
              </View>
              <View style={styles.route}>
                <MapPin size={12} color={colors.subtle} />
                <Text numberOfLines={2} style={styles.address}>{delivery.pickupAddress}</Text>
              </View>
              <View style={styles.route}>
                <MapPin size={12} color={colors.subtle} />
                <Text numberOfLines={2} style={styles.address}>{delivery.dropoffAddress}</Text>
              </View>
              <Text style={styles.date}>{delivery.completedAt ? new Date(delivery.completedAt).toLocaleString("en-IN") : delivery.createdAt ? new Date(delivery.createdAt).toLocaleString("en-IN") : ""}</Text>
            </Card>
          </Pressable>
        ))}
        <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <View style={styles.backdrop}>
            <Card style={styles.modal}>
              <Text style={styles.modalTitle}>Trip Timeline · #{selected?.trackingNumber || selected?.id.slice(0, 8)}</Text>
              {loadingEvents ? <Loading label="Loading timeline..." /> : events.length ? events.map((event, index) => (
                <View key={String(event.id || index)} style={styles.event}>
                  <View style={styles.eventDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventName}>{String(event.eventType || event.status || "Delivery update").replace(/_/g, " ")}</Text>
                    <Text style={styles.date}>{String(event.timestamp || event.createdAt || "")}</Text>
                  </View>
                </View>
              )) : <Text style={styles.emptyText}>No timeline events are available.</Text>}
              <Button title="Close" onPress={() => setSelected(null)} variant="secondary" />
            </Card>
          </View>
        </Modal>
      </Page>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.red, backgroundColor: colors.redBg, padding: 11, borderRadius: 11, fontSize: 11 },
  filters: { flexDirection: "row", gap: 7, padding: 4, backgroundColor: colors.card, borderRadius: 13, borderWidth: 1, borderColor: colors.border },
  filter: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  filterSelected: { backgroundColor: "rgba(255,255,255,0.09)" },
  filterText: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  filterTextSelected: { color: colors.foreground },
  empty: { alignItems: "center", gap: 12, paddingVertical: 35 },
  emptyTitle: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  emptyText: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: "center" },
  delivery: { gap: 12, padding: 15 },
  deliveryHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  order: { color: colors.foreground, fontSize: 12, fontWeight: "700" },
  status: { color: colors.muted, fontSize: 9, marginTop: 3 },
  amount: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  route: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  address: { flex: 1, color: "#d4d4d8", fontSize: 10, lineHeight: 15 },
  date: { color: colors.subtle, fontSize: 9 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.75)" },
  modal: { maxHeight: "78%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 14 },
  modalTitle: { color: colors.foreground, fontSize: 15, fontWeight: "700" },
  event: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  eventDot: { width: 7, height: 7, borderRadius: 4, marginTop: 4, backgroundColor: colors.foreground },
  eventName: { color: colors.foreground, fontSize: 11, fontWeight: "600" },
});
