import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertTriangle, CheckCircle2, Clock3, MapPin, Phone, ShieldCheck, Store, UserRound } from "lucide-react-native";
import { apiClient, getErrorMessage, normalizeDelivery } from "../api";
import { RouteMap } from "../components/RouteMap";
import { Button, Card, Field, Loading, Page, Screen, Title, currencyFromPaise } from "../components/ui";
import { colors } from "../theme";
import type { Delivery as DeliveryType, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Delivery">;

const pickupStatuses = new Set(["ASSIGNED", "ACCEPTED", "ARRIVING_AT_PICKUP", "ARRIVED_AT_PICKUP", "PICKUP_PENDING", "PICKUP_VERIFICATION"]);
const dropoffStatuses = new Set(["PICKED_UP", "PICKUP_COMPLETE", "IN_TRANSIT", "OUT_FOR_DELIVERY", "ARRIVED_AT_DROPOFF", "DELIVERY_VERIFICATION", "ARRIVED"]);

export function DeliveryScreen({ route, navigation }: Props) {
  const { deliveryId } = route.params;
  const [delivery, setDelivery] = useState<DeliveryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pickupOtp, setPickupOtp] = useState("");
  const [dropoffOtp, setDropoffOtp] = useState("");
  const [showIncident, setShowIncident] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [description, setDescription] = useState("");
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);

  const fetchDelivery = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/api/delivery/jobs/${deliveryId}`);
      if (data?.delivery) setDelivery(normalizeDelivery(data.delivery));
      setError("");
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not load delivery details."));
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    void fetchDelivery();
    const timer = setInterval(() => void fetchDelivery(), 8000);
    return () => clearInterval(timer);
  }, [fetchDelivery]);

  const performAction = async (action: string, body?: Record<string, string>) => {
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/${action}`, body);
      setSuccess(action === "verify-pickup" ? "Pickup verified. Collect the package and continue." :
        action === "verify-dropoff" ? "Delivery completed successfully. Payout credited." :
          "Delivery status updated.");
      if (action === "verify-pickup") setPickupOtp("");
      if (action === "verify-dropoff") setDropoffOtp("");
      await fetchDelivery();
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not update delivery status."));
    } finally {
      setWorking(false);
    }
  };

  const verifyOtp = (stage: "pickup" | "dropoff") => {
    const code = stage === "pickup" ? pickupOtp.trim() : dropoffOtp.trim();
    if (!code) {
      setError(`Enter the ${stage} verification OTP.`);
      return;
    }
    void performAction(stage === "pickup" ? "verify-pickup" : "verify-dropoff", { code });
  };

  const submitIncident = async () => {
    if (!description.trim()) {
      setError("Describe the delivery issue before submitting.");
      return;
    }
    setWorking(true);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/incident`, {
        incidentType: "OTHER",
        description: description.trim(),
      });
      setShowIncident(false);
      setDescription("");
      setSuccess("Incident reported to the operations team.");
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not report this incident."));
    } finally {
      setWorking(false);
    }
  };

  const cancelDelivery = async () => {
    if (!description.trim()) {
      setError("Provide a cancellation reason.");
      return;
    }
    setWorking(true);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/cancel`, { reason: description.trim() });
      setShowCancel(false);
      setDescription("");
      Alert.alert("Delivery cancelled", "The assignment has been cancelled.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not cancel this delivery."));
    } finally {
      setWorking(false);
    }
  };

  const showAuditTimeline = async () => {
    setShowTimeline(true);
    try {
      const { data } = await apiClient.get(`/api/delivery/jobs/${deliveryId}/timeline`);
      setTimeline(Array.isArray(data?.events) ? data.events as Record<string, unknown>[] : []);
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not load the delivery timeline."));
    }
  };

  if (loading) return <Loading label="Loading delivery details..." />;
  if (!delivery) {
    return (
      <Screen>
        <Page>
          <Text style={styles.empty}>Delivery not found or no longer assigned to you.</Text>
          <Button title="Return to dashboard" onPress={() => navigation.goBack()} />
        </Page>
      </Screen>
    );
  }

  const status = delivery.status;
  const isPickup = pickupStatuses.has(status);
  const isDropoff = dropoffStatuses.has(status);
  const completed = status === "DELIVERED" || status === "COMPLETED";
  const cancelled = status === "CANCELLED" || status === "FAILED";
  const progress = completed ? 4 : isDropoff ? 3 : status === "ARRIVED_AT_PICKUP" || status === "PICKUP_VERIFICATION" ? 2 : 1;

  return (
    <Screen>
      <Page>
        <View style={styles.top}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹  Dashboard</Text></Pressable>
          <View style={styles.topActions}>
            <Pressable onPress={() => void showAuditTimeline()} style={styles.smallAction}><Clock3 size={14} color={colors.muted} /></Pressable>
            <Pressable onPress={() => { setDescription(""); setShowIncident(true); }} style={styles.smallAction}><AlertTriangle size={14} color={colors.red} /></Pressable>
          </View>
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Card style={styles.summary}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.eyebrow}>DELIVERY #{delivery.trackingNumber || delivery.id.slice(0, 8)}</Text>
              <Text style={styles.status}>{status.replace(/_/g, " ")}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.eyebrow}>PAYOUT</Text>
              <Text style={styles.payout}>{currencyFromPaise(delivery.riderPayoutAmountPaise)}</Text>
            </View>
          </View>
          <View style={styles.progress}>
            {[1, 2, 3, 4].map((step) => <View key={step} style={[styles.progressStep, step <= progress && styles.progressActive]} />)}
          </View>
          <View style={styles.progressLabels}><Text style={styles.eyebrow}>Assigned</Text><Text style={styles.eyebrow}>At pickup</Text><Text style={styles.eyebrow}>In transit</Text><Text style={styles.eyebrow}>Delivered</Text></View>
        </Card>

        <Card style={styles.routeCard}>
          <View style={styles.routeHeading}><MapPin size={16} color={colors.foreground} /><Text style={styles.cardTitle}>Route Details</Text></View>
          <View style={styles.routeItem}>
            <View style={styles.routeDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>PICKUP · {delivery.pickupContactName || "Partner Merchant"}</Text>
              <Text style={styles.address}>{delivery.pickupAddress}</Text>
              {delivery.pickupContactPhone ? <Pressable onPress={() => void Linking.openURL(`tel:${delivery.pickupContactPhone}`)} style={styles.contact}><Phone size={12} color={colors.muted} /><Text style={styles.contactText}>{delivery.pickupContactPhone}</Text></Pressable> : null}
            </View>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeItem}>
            <View style={[styles.routeDot, styles.dropoffDot]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>DROP-OFF · {delivery.dropoffContactName || "Customer"}</Text>
              <Text style={styles.address}>{delivery.dropoffAddress}</Text>
              {delivery.dropoffContactPhone ? <Pressable onPress={() => void Linking.openURL(`tel:${delivery.dropoffContactPhone}`)} style={styles.contact}><Phone size={12} color={colors.muted} /><Text style={styles.contactText}>{delivery.dropoffContactPhone}</Text></Pressable> : null}
            </View>
          </View>
          <View style={styles.routeStats}>
            <Text style={styles.routeStat}>{delivery.distanceKm ?? "—"} km</Text>
            <Text style={styles.routeStat}>~{delivery.durationMins ?? 15} min</Text>
          </View>
        </Card>
        <RouteMap
          pickupAddress={delivery.pickupAddress}
          dropoffAddress={delivery.dropoffAddress}
          distanceKm={delivery.distanceKm}
          durationMins={delivery.durationMins}
          toPickup={isPickup}
          pickupUrl={delivery.pickupNavigationUrl}
          dropoffUrl={delivery.dropoffNavigationUrl}
        />

        {isPickup ? (
          <Card style={styles.actionCard}>
            <View style={styles.actionHeading}><Store size={17} color={colors.foreground} /><Text style={styles.cardTitle}>Step 1 · Store Pickup</Text></View>
            {(status === "ASSIGNED" || status === "ACCEPTED") ? <Button title="Start Navigation to Pickup" onPress={() => void performAction("start-pickup")} loading={working} /> : null}
            {status === "ARRIVING_AT_PICKUP" ? <Button title="I Have Arrived at Pickup Store" onPress={() => void performAction("arrived-pickup")} loading={working} /> : null}
            {status === "ARRIVED_AT_PICKUP" || status === "PICKUP_VERIFICATION" ? (
              <>
                <Field label="Store Pickup Verification OTP" value={pickupOtp} onChangeText={setPickupOtp} placeholder="Enter store OTP" keyboardType="number-pad" maxLength={8} />
                <Text style={styles.helper}>Ask the store manager for the order pickup OTP.</Text>
                <Button title="Verify Pickup & Collect Package" onPress={() => verifyOtp("pickup")} loading={working} />
              </>
            ) : null}
          </Card>
        ) : null}

        {isDropoff ? (
          <Card style={styles.actionCard}>
            <View style={styles.actionHeading}><UserRound size={17} color={colors.foreground} /><Text style={styles.cardTitle}>Step 2 · Customer Drop-off</Text></View>
            {status === "PICKED_UP" || status === "PICKUP_COMPLETE" ? <Button title="Start Navigation to Customer" onPress={() => void performAction("start-dropoff")} loading={working} /> : null}
            {status === "IN_TRANSIT" || status === "OUT_FOR_DELIVERY" ? <Button title="I Have Arrived at Customer Location" onPress={() => void performAction("arrived-dropoff")} loading={working} /> : null}
            {status === "ARRIVED_AT_DROPOFF" || status === "DELIVERY_VERIFICATION" || status === "ARRIVED" ? (
              <>
                <Field label="Customer Drop-off OTP" value={dropoffOtp} onChangeText={setDropoffOtp} placeholder="Enter customer OTP" keyboardType="number-pad" maxLength={8} />
                <Text style={styles.helper}>Ask the customer for their delivery verification OTP.</Text>
                <Button title="Verify OTP & Complete Delivery" onPress={() => verifyOtp("dropoff")} loading={working} />
              </>
            ) : null}
          </Card>
        ) : null}
        {completed ? (
          <Card style={styles.complete}><CheckCircle2 size={22} color={colors.green} /><Text style={styles.cardTitle}>Delivery completed</Text><Text style={styles.helper}>The payout has been added to your earnings.</Text></Card>
        ) : null}
        {cancelled ? <Card style={styles.cancelled}><Text style={styles.cardTitle}>Delivery {status.toLowerCase()}</Text><Text style={styles.helper}>This delivery is no longer active.</Text></Card> : null}
        {!completed && !cancelled ? <Button title="Cancel Delivery Assignment" variant="danger" onPress={() => { setDescription(""); setShowCancel(true); }} /> : null}

        <IssueModal visible={showIncident} title="Report Delivery Issue" hint="Describe what happened so dispatch can assist." value={description} onChange={setDescription} onClose={() => setShowIncident(false)} onSubmit={() => void submitIncident()} loading={working} submitTitle="Submit Report" />
        <IssueModal visible={showCancel} title="Cancel Delivery" hint="Provide a reason for cancelling this assignment." value={description} onChange={setDescription} onClose={() => setShowCancel(false)} onSubmit={() => void cancelDelivery()} loading={working} submitTitle="Confirm Cancellation" />
        <Modal visible={showTimeline} transparent animationType="slide" onRequestClose={() => setShowTimeline(false)}>
          <View style={styles.modalBackdrop}><Card style={styles.timeline}>
            <Text style={styles.cardTitle}>Delivery Timeline Audit</Text>
            {timeline.length ? timeline.map((event, index) => <Text key={String(event.id || index)} style={styles.helper}>{String(event.eventType || event.status || "Delivery update")} · {String(event.timestamp || event.createdAt || "")}</Text>) : <Text style={styles.helper}>No timeline events are available.</Text>}
            <Button title="Close" variant="secondary" onPress={() => setShowTimeline(false)} />
          </Card></View>
        </Modal>
      </Page>
    </Screen>
  );
}

function IssueModal({ visible, title, hint, value, onChange, onClose, onSubmit, loading, submitTitle }: {
  visible: boolean;
  title: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  submitTitle: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Card style={styles.issueModal}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.helper}>{hint}</Text>
          <Field label="Details" value={value} onChangeText={onChange} multiline placeholder="Type here..." />
          <Button title={submitTitle} onPress={onSubmit} loading={loading} />
          <Button title="Go back" onPress={onClose} variant="secondary" />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: colors.muted, fontSize: 12, paddingVertical: 5 },
  topActions: { flexDirection: "row", gap: 8 },
  smallAction: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  error: { padding: 11, borderRadius: 11, backgroundColor: colors.redBg, color: colors.red, fontSize: 11 },
  success: { padding: 11, borderRadius: 11, backgroundColor: colors.greenBg, color: colors.green, fontSize: 11 },
  summary: { gap: 15 },
  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: colors.subtle, fontSize: 9, fontWeight: "700", letterSpacing: 0.6 },
  status: { color: colors.foreground, fontSize: 17, fontWeight: "700", marginTop: 4 },
  payout: { color: colors.foreground, fontSize: 20, fontWeight: "700", marginTop: 3 },
  progress: { flexDirection: "row", gap: 6 },
  progressStep: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)" },
  progressActive: { backgroundColor: colors.white },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  routeCard: { gap: 15 },
  routeHeading: { flexDirection: "row", alignItems: "center", gap: 9 },
  cardTitle: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  routeItem: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  routeDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.foreground, marginTop: 2 },
  dropoffDot: { backgroundColor: colors.foreground },
  routeDivider: { width: 1, height: 13, backgroundColor: colors.borderStrong, marginLeft: 4 },
  address: { color: "#d4d4d8", fontSize: 11, lineHeight: 17, marginTop: 5 },
  contact: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  contactText: { color: colors.muted, fontSize: 11 },
  routeStats: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 18 },
  routeStat: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  navigateLink: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: "auto" },
  navigateText: { color: colors.foreground, fontSize: 10, fontWeight: "700" },
  actionCard: { gap: 13 },
  actionHeading: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 1 },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  complete: { alignItems: "center", gap: 10, paddingVertical: 23 },
  cancelled: { alignItems: "center", gap: 8, paddingVertical: 24 },
  empty: { color: colors.muted, fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.72)" },
  issueModal: { width: "100%", gap: 14, padding: 19, backgroundColor: "#111115" },
  timeline: { width: "100%", maxHeight: "75%", gap: 14, padding: 19, backgroundColor: "#111115" },
});
