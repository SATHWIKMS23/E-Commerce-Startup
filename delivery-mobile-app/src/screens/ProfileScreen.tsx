import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { apiClient, getErrorMessage, normalizeRider } from "../api";
import { Button, Card, Field, Loading, Page, Screen, Title } from "../components/ui";
import { colors } from "../theme";
import type { RootStackParamList, Rider } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const { rider, updateRider, signOut } = useAuth();
  const [profile, setProfile] = useState<Rider | null>(rider);
  const [loading, setLoading] = useState(!rider);
  const [appealId, setAppealId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    try {
      const { data } = await apiClient.get("/api/delivery/riders/me");
      const currentRider = normalizeRider(data?.rider);
      if (currentRider) {
        setProfile(currentRider);
        await updateRider(currentRider);
      }
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not load rider profile."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchProfile(); }, []);

  const submitAppeal = async () => {
    if (!appealId || !appealReason.trim()) {
      setError("Enter a reason for your appeal.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiClient.post(`/api/delivery/strikes/${appealId}/appeal`, { appealNotes: appealReason.trim() });
      setAppealId(null);
      setAppealReason("");
      await fetchProfile();
      Alert.alert("Appeal submitted", "Your appeal has been sent to the operations team.");
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not submit the appeal."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Loading rider profile..." />;
  const initials = `${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}` || "R";
  const bicycle = profile?.vehicleType === "BICYCLE";

  return (
    <Screen>
      <Page>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹  Dashboard</Text></Pressable>
        <View style={styles.heading}>
          <Title subtitle="Personal information, vehicle compliance and account settings.">Rider Profile</Title>
          <Text style={styles.statusBadge}>{profile?.verificationStatus || "PENDING"}</Text>
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Card style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.name}>{profile?.firstName} {profile?.lastName}</Text>
            <Text style={styles.detail}>{profile?.email}</Text>
            <Text style={styles.detail}>{profile?.phone}</Text>
            <Text style={styles.detail}>AtlasBasket Delivery Partner · {profile?.city || "District pending"}</Text>
          </View>
        </Card>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle & Driving Details</Text>
          <ProfileValue label="Vehicle Type" value={(profile?.vehicleType || "Not submitted").replace(/_/g, " ")} />
          <ProfileValue label="Registration / Plate No." value={profile?.vehicleNumber || (bicycle ? "N/A · Bicycle exemption" : "Pending")} />
          <ProfileValue label="Driving Licence" value={bicycle ? "Legally exempt" : profile?.drivingLicenseNumber || "Pending verification"} />
        </Card>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Identity Protection & Aadhaar</Text>
          <ProfileValue label="Masked Aadhaar Number" value={profile?.aadhaarNumberMasked || "XXXX-XXXX-••••"} />
          <Text style={styles.detail}>Identity numbers are masked and protected. Full Aadhaar numbers are not shown in your profile.</Text>
        </Card>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Destination</Text>
          <ProfileValue label="Account Holder" value={profile?.bankAccountHolderName || `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Not provided"} />
          <ProfileValue label="Bank Name" value={profile?.bankName || "Not provided"} />
          <ProfileValue label="Account Number" value={profile?.bankAccountNumber ? `••••${profile.bankAccountNumber.slice(-4)}` : "Not provided"} />
          <ProfileValue label="IFSC" value={profile?.bankIfsc || "Not provided"} />
        </Card>
        {profile?.strikes?.length ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Account Strikes & Appeals</Text>
            {profile.strikes.map((strike) => (
              <View key={strike.id} style={styles.strikeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.strikeTitle}>{strike.reason || "Account strike"} · {strike.status || "ACTIVE"}</Text>
                </View>
                <Pressable onPress={() => { setAppealReason(""); setAppealId(appealId === strike.id ? null : strike.id); }}>
                  <Text style={styles.appealLink}>{appealId === strike.id ? "Close" : "Appeal"}</Text>
                </Pressable>
                {appealId === strike.id ? (
                  <View style={styles.appealForm}>
                    <Field label="Appeal reason" value={appealReason} onChangeText={setAppealReason} multiline placeholder="Explain why this strike should be reviewed." />
                    <Button title="Submit Appeal" onPress={() => void submitAppeal()} loading={busy} />
                  </View>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}
        <Button title="Delivery History" variant="secondary" onPress={() => navigation.navigate("History")} />
        <Button title="Sign Out" variant="danger" onPress={() => Alert.alert("Sign out?", "You will be returned to the rider sign-in screen.", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: () => void signOut() }])} />
      </Page>
    </Screen>
  );
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return <View style={styles.valueRow}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  back: { color: colors.muted, fontSize: 12, paddingVertical: 5 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  statusBadge: { color: colors.muted, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 10, paddingVertical: 6, fontSize: 8, fontWeight: "700" },
  error: { color: colors.red, backgroundColor: colors.redBg, borderRadius: 11, padding: 11, fontSize: 11 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  avatar: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.cardStrong, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  initials: { color: colors.foreground, fontSize: 20, fontWeight: "700" },
  name: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  detail: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  section: { gap: 13, padding: 17 },
  sectionTitle: { color: colors.foreground, fontSize: 13, fontWeight: "700", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
  valueRow: { gap: 4 },
  label: { color: colors.subtle, fontSize: 9, fontWeight: "600" },
  value: { color: "#e4e4e7", fontSize: 11, fontWeight: "600" },
  strikeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 9 },
  strikeTitle: { color: colors.muted, fontSize: 10 },
  appealLink: { color: colors.foreground, fontSize: 10, fontWeight: "700", padding: 4 },
  appealForm: { width: "100%", gap: 10 },
});
