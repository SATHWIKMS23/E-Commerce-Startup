import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiClient, getErrorMessage, normalizeRider } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, Field, Loading, Message, Page, Screen, Title } from "../components/ui";
import { useDeliverySettings } from "../settings/DeliverySettingsContext";
import { colors } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "CompleteProfile">;
export function CompleteProfileScreen({ navigation }: Props) {
  const { rider, updateRider } = useAuth();
  const { settings, districts, districtsError, refresh } = useDeliverySettings();
  const vehicleTypes = settings?.supportedVehicles ?? ["BICYCLE", "MOTORCYCLE", "SCOOTER", "EV"];
  const [form, setForm] = useState({
    phone: rider?.phone?.startsWith("G_") ? "" : rider?.phone || "",
    dateOfBirth: rider?.dateOfBirth?.slice(0, 10) || "",
    city: rider?.city || "",
    residentialAddress: rider?.residentialAddress || "",
    emergencyContactName: rider?.emergencyContactName || "",
    emergencyContactPhone: rider?.emergencyContactPhone || "",
    vehicleType: rider?.vehicleType || "MOTORCYCLE",
    vehicleNumber: rider?.vehicleNumber || "",
    licenseNumber: rider?.licenseNumber || rider?.drivingLicenseNumber || "",
    rcNumber: rider?.rcNumber || "",
    insuranceNumber: rider?.insuranceNumber || "",
    drivingLicenseDocUrl: rider?.drivingLicenseDocUrl || "",
    rcDocUrl: rider?.rcDocUrl || "",
    insuranceDocUrl: rider?.insuranceDocUrl || "",
    aadhaarNumber: "",
    aadhaarDocUrl: rider?.aadhaarDocUrl || "",
    bankAccountName: rider?.bankAccountName || rider?.bankAccountHolderName || "",
    bankAccountNumber: rider?.bankAccountNumber || "",
    bankIfsc: rider?.bankIfsc || "",
    upiId: rider?.upiId || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!settings || vehicleTypes.includes(form.vehicleType)) return;
    setForm((previous) => ({ ...previous, vehicleType: vehicleTypes[0] || "" }));
  }, [form.vehicleType, settings, vehicleTypes]);

  const update = (key: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError("");
  };

  const submit = async () => {
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number.");
      return;
    }
    if (!form.dateOfBirth || !form.city) {
      setError("Date of birth and an active delivery district are required.");
      return;
    }
    if (!districts?.some((district) => district.name === form.city)) {
      setError("Select a district that is currently enabled by operations.");
      return;
    }
    if (!vehicleTypes.length || !form.vehicleType) {
      setError("No vehicle types are currently enabled for rider profiles.");
      return;
    }
    if (form.vehicleType !== "BICYCLE" && !form.licenseNumber.trim() && !form.drivingLicenseDocUrl.trim()) {
      setError("A valid driving licence number or document link is required for motorized vehicles.");
      return;
    }
    if (!form.aadhaarNumber.trim() && !form.aadhaarDocUrl.trim()) {
      setError("Provide an Aadhaar number or identity document link.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await apiClient.put("/api/delivery/riders/me", form);
      const updatedRider = normalizeRider(data?.rider);
      if (!updatedRider) throw new Error("The server did not return the updated rider profile.");
      await updateRider(updatedRider);
      navigation.goBack();
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not update rider details."));
    } finally {
      setSaving(false);
    }
  };

  if (!rider) return <Loading label="Loading rider profile..." />;

  return (
    <Screen>
      <Page contentContainerStyle={styles.page}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹  Dashboard</Text></Pressable>
        <Title subtitle="Complete the information needed for delivery verification.">Rider Details</Title>
        {error ? <Message>{error}</Message> : null}
        {districtsError ? <Message>{districtsError}</Message> : null}
        <Card style={styles.card}>
          <Text style={styles.heading}>Personal Information</Text>
          <Field label="Phone Number *" value={form.phone} onChangeText={(value) => update("phone", value)} keyboardType="phone-pad" />
          <Field label="Date of Birth * (YYYY-MM-DD)" value={form.dateOfBirth} onChangeText={(value) => update("dateOfBirth", value)} placeholder="1995-08-25" />
          <Text style={styles.label}>Operational District *</Text>
          {districts === null ? <Text style={styles.hint}>Loading active districts…</Text> : districts.length ? (
            <View style={styles.options}>
              {districts.map((district) => <Option key={district.id} label={`${district.name} · ${district.state}`} selected={form.city === district.name} onPress={() => update("city", district.name)} />)}
            </View>
          ) : <Text style={styles.hint}>No active districts are currently enabled.</Text>}
          <Field label="Residential Address" value={form.residentialAddress} onChangeText={(value) => update("residentialAddress", value)} multiline />
          <Field label="Emergency Contact Name" value={form.emergencyContactName} onChangeText={(value) => update("emergencyContactName", value)} />
          <Field label="Emergency Contact Phone" value={form.emergencyContactPhone} onChangeText={(value) => update("emergencyContactPhone", value)} keyboardType="phone-pad" />
        </Card>
        <Card style={styles.card}>
          <Text style={styles.heading}>Vehicle Information</Text>
          {vehicleTypes.length ? (
            <View style={styles.options}>
              {vehicleTypes.map((vehicle) => <Option key={vehicle} label={vehicle.replace(/_/g, " ")} selected={form.vehicleType === vehicle} onPress={() => update("vehicleType", vehicle)} />)}
            </View>
          ) : <Text style={styles.hint}>No vehicle types are currently enabled by operations.</Text>}
          {form.vehicleType !== "BICYCLE" ? (
            <>
              <Field label="Vehicle Registration Number" value={form.vehicleNumber} onChangeText={(value) => update("vehicleNumber", value.toUpperCase())} autoCapitalize="characters" />
              <Field label="Driving Licence Number *" value={form.licenseNumber} onChangeText={(value) => update("licenseNumber", value.toUpperCase())} autoCapitalize="characters" />
              <Field label="Driving Licence Document Link" value={form.drivingLicenseDocUrl} onChangeText={(value) => update("drivingLicenseDocUrl", value)} keyboardType="url" autoCapitalize="none" />
              <Field label="RC Number" value={form.rcNumber} onChangeText={(value) => update("rcNumber", value)} />
              <Field label="RC Document Link" value={form.rcDocUrl} onChangeText={(value) => update("rcDocUrl", value)} keyboardType="url" autoCapitalize="none" />
              <Field label="Insurance Number" value={form.insuranceNumber} onChangeText={(value) => update("insuranceNumber", value)} />
              <Field label="Insurance Document Link" value={form.insuranceDocUrl} onChangeText={(value) => update("insuranceDocUrl", value)} keyboardType="url" autoCapitalize="none" />
            </>
          ) : null}
        </Card>
        <Card style={styles.card}>
          <Text style={styles.heading}>Identity Verification</Text>
          <Message tone="info">Your full Aadhaar number is not stored. Only a masked number will appear on your profile.</Message>
          <Field label="Aadhaar Number" value={form.aadhaarNumber} onChangeText={(value) => update("aadhaarNumber", value.replace(/\D/g, "").slice(0, 12))} keyboardType="number-pad" maxLength={12} />
          <Field label="Aadhaar Document Link" value={form.aadhaarDocUrl} onChangeText={(value) => update("aadhaarDocUrl", value)} keyboardType="url" autoCapitalize="none" />
        </Card>
        <Card style={styles.card}>
          <Text style={styles.heading}>Payout Details</Text>
          <Field label="Bank Account Holder Name" value={form.bankAccountName} onChangeText={(value) => update("bankAccountName", value)} />
          <Field label="Bank Account Number" value={form.bankAccountNumber} onChangeText={(value) => update("bankAccountNumber", value)} keyboardType="number-pad" />
          <Field label="IFSC Code" value={form.bankIfsc} onChangeText={(value) => update("bankIfsc", value.toUpperCase())} autoCapitalize="characters" />
          <Field label="UPI ID" value={form.upiId} onChangeText={(value) => update("upiId", value)} autoCapitalize="none" />
        </Card>
        <Button title="Submit Details for Verification" onPress={() => void submit()} loading={saving} />
      </Page>
    </Screen>
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.option, selected && styles.optionSelected]}><Text style={[styles.optionText, selected && styles.selectedText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  page: { gap: 15 },
  back: { color: colors.muted, fontSize: 12, paddingVertical: 5 },
  card: { gap: 13, padding: 16 },
  heading: { color: colors.foreground, fontSize: 13, fontWeight: "700", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 9 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  hint: { color: colors.subtle, fontSize: 10 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: colors.card },
  optionSelected: { backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.32)" },
  optionText: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  selectedText: { color: colors.foreground },
});
