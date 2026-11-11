import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getErrorMessage } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, Field, Message, Page, Screen, Title } from "../components/ui";
import { useDeliverySettings } from "../settings/DeliverySettingsContext";
import { colors } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;
type VehicleType = string;
const DEFAULT_VEHICLES = ["BICYCLE", "MOTORCYCLE", "SCOOTER", "EV"];
const vehicleLabels: Record<string, string> = {
  BICYCLE: "Bicycle (no licence needed)",
  MOTORCYCLE: "Motorcycle / Bike",
  SCOOTER: "Scooter",
  EV: "Electric 2-wheeler",
};

const initialForm: Record<string, string> = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
  dateOfBirth: "",
  city: "",
  residentialAddress: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  vehicleType: "MOTORCYCLE",
  vehicleNumber: "",
  licenseNumber: "",
  rcNumber: "",
  insuranceNumber: "",
  drivingLicenseDocUrl: "",
  rcDocUrl: "",
  insuranceDocUrl: "",
  aadhaarNumber: "",
  aadhaarDocUrl: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  upiId: "",
};

const steps = ["Personal", "Vehicle", "Identity", "Payout"];

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { settings, districts, districtsError, refresh } = useDeliverySettings();
  const vehicleTypes = settings?.supportedVehicles ?? DEFAULT_VEHICLES;
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!settings || vehicleTypes.includes(form.vehicleType)) return;
    setForm((previous) => ({ ...previous, vehicleType: vehicleTypes[0] || "" }));
  }, [form.vehicleType, settings, vehicleTypes]);

  useEffect(() => {
    if (districts?.length === 1) {
      setForm((previous) => previous.city ? previous : { ...previous, city: districts[0].name });
    } else if (districts && !districts.some((district) => district.name === form.city)) {
      setForm((previous) => ({ ...previous, city: "" }));
    }
  }, [districts, form.city]);

  const update = (key: string, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError("");
  };

  const validate = (): string | null => {
    if (step === 0) {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.email.trim() || !form.password) {
        return "Complete all required personal details.";
      }
      if (form.phone.replace(/\D/g, "").length < 10) return "Enter a valid phone number.";
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address.";
      if (form.password.length < 8) return "Use a password with at least 8 characters.";
      if (!form.dateOfBirth) return "Date of birth is required to verify age eligibility (18+).";
      const dateOfBirth = new Date(form.dateOfBirth);
      if (Number.isNaN(dateOfBirth.getTime())) return "Enter date of birth as YYYY-MM-DD.";
      const age = new Date().getFullYear() - dateOfBirth.getFullYear();
      if (age < 18) return "You must be at least 18 years old to deliver.";
      if (!districts) return "Wait for the active delivery districts to load.";
      if (!districts.length) return "No delivery districts are currently enabled.";
      if (!districts.some((district) => district.name === form.city)) return "Select an active delivery district.";
    }
    if (step === 1 && !vehicleTypes.length) {
      return "No vehicle types are currently enabled for registration.";
    }
    if (step === 1 && form.vehicleType !== "BICYCLE" && !form.licenseNumber.trim() && !form.drivingLicenseDocUrl.trim()) {
      return "A valid driving licence number or document link is required for motorized vehicles.";
    }
    if (step === 2 && !form.aadhaarNumber.trim() && !form.aadhaarDocUrl.trim()) {
      return "Provide an Aadhaar number or identity document link.";
    }
    return null;
  };

  const advance = async () => {
    if (settings?.isDeliveryServiceEnabled === false) {
      setError("Rider registration is temporarily paused by delivery operations.");
      return;
    }
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await register(form);
    } catch (cause) {
      setError(getErrorMessage(cause, "Registration failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Page contentContainerStyle={styles.page}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹  Back</Text></Pressable>
        <Title subtitle="Deliver orders from local shops and earn with every trip.">Rider Registration</Title>
        {settings?.isDeliveryServiceEnabled === false ? (
          <Message tone="warning">Rider registration is temporarily paused by delivery operations.</Message>
        ) : null}

        <View style={styles.stepper}>
          {steps.map((label, index) => {
            const active = step === index;
            const completed = step > index;
            return (
              <View key={label} style={styles.step}>
                <View style={[styles.stepCircle, (active || completed) && styles.stepActive]}>
                  <Text style={[styles.stepNumber, (active || completed) && styles.stepNumberActive]}>{completed ? "✓" : index + 1}</Text>
                </View>
                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
              </View>
            );
          })}
        </View>

        <Card style={styles.card}>
          {error ? <Message>{error}</Message> : null}
          <Text style={styles.groupTitle}>{["PERSONAL INFORMATION", "VEHICLE INFORMATION", "IDENTITY VERIFICATION", "PAYOUT DETAILS"][step]}</Text>
          {step === 0 ? (
            <>
              <View style={styles.row}>
                <Field containerStyle={styles.half} label="First Name *" value={form.firstName} onChangeText={(value) => update("firstName", value)} autoCapitalize="words" />
                <Field containerStyle={styles.half} label="Last Name *" value={form.lastName} onChangeText={(value) => update("lastName", value)} autoCapitalize="words" />
              </View>
              <Field label="Phone Number *" value={form.phone} onChangeText={(value) => update("phone", value)} keyboardType="phone-pad" autoComplete="tel" />
              <Field label="Email Address *" value={form.email} onChangeText={(value) => update("email", value)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <Field label="Password * (minimum 8 characters)" value={form.password} onChangeText={(value) => update("password", value)} secureTextEntry autoComplete="new-password" />
              <Field label="Date of Birth * (YYYY-MM-DD)" value={form.dateOfBirth} onChangeText={(value) => update("dateOfBirth", value)} placeholder="1995-08-25" />
              <Text style={styles.label}>Operational District *</Text>
              {districtsError ? <Message>{districtsError}</Message> : null}
              {districts?.length ? (
                <View style={styles.options}>
                  {districts.map((district) => (
                    <Option key={district.id} label={`${district.name} · ${district.state}`} selected={form.city === district.name} onPress={() => update("city", district.name)} />
                  ))}
                </View>
              ) : districts === null ? <Text style={styles.helper}>Loading admin-enabled districts…</Text> : <Text style={styles.helper}>No active districts are currently enabled.</Text>}
              <Field label="Residential Address" value={form.residentialAddress} onChangeText={(value) => update("residentialAddress", value)} multiline placeholder="Area, street, locality" />
              <Field label="Emergency Contact Name" value={form.emergencyContactName} onChangeText={(value) => update("emergencyContactName", value)} />
              <Field label="Emergency Contact Phone" value={form.emergencyContactPhone} onChangeText={(value) => update("emergencyContactPhone", value)} keyboardType="phone-pad" />
            </>
          ) : null}
          {step === 1 ? (
            <>
              <Text style={styles.label}>Select Vehicle Type *</Text>
              {vehicleTypes.length ? (
                <View style={styles.options}>
                  {vehicleTypes.map((type) => (
                    <Option key={type} label={vehicleLabels[type] || type.replace(/_/g, " ")} selected={form.vehicleType === type} onPress={() => update("vehicleType", type satisfies VehicleType)} />
                  ))}
                </View>
              ) : <Text style={styles.helper}>No vehicle types are currently enabled by operations.</Text>}
              {form.vehicleType !== "BICYCLE" ? (
                <>
                  <Field label="Vehicle Registration Number (RC)" value={form.vehicleNumber} onChangeText={(value) => update("vehicleNumber", value.toUpperCase())} autoCapitalize="characters" />
                  <Field label="Driving Licence Number *" value={form.licenseNumber} onChangeText={(value) => update("licenseNumber", value.toUpperCase())} autoCapitalize="characters" />
                  <Field label="Driving Licence Document Link" value={form.drivingLicenseDocUrl} onChangeText={(value) => update("drivingLicenseDocUrl", value)} autoCapitalize="none" keyboardType="url" />
                  <Field label="RC Document Link" value={form.rcDocUrl} onChangeText={(value) => update("rcDocUrl", value)} autoCapitalize="none" keyboardType="url" />
                  <Field label="Insurance Number" value={form.insuranceNumber} onChangeText={(value) => update("insuranceNumber", value)} />
                  <Field label="Insurance Document Link" value={form.insuranceDocUrl} onChangeText={(value) => update("insuranceDocUrl", value)} autoCapitalize="none" keyboardType="url" />
                </>
              ) : null}
            </>
          ) : null}
          {step === 2 ? (
            <>
              <Message tone="info">Your identity number is masked before storage. Only the last four digits are retained.</Message>
              <Field label="Aadhaar Number *" value={form.aadhaarNumber} onChangeText={(value) => update("aadhaarNumber", value.replace(/\D/g, "").slice(0, 12))} keyboardType="number-pad" maxLength={12} />
              <Text style={styles.helper}>Or provide an identity document link if you do not have a number available.</Text>
              <Field label="Aadhaar Document Link" value={form.aadhaarDocUrl} onChangeText={(value) => update("aadhaarDocUrl", value)} autoCapitalize="none" keyboardType="url" />
            </>
          ) : null}
          {step === 3 ? (
            <>
              <Field label="Bank Account Holder Name" value={form.bankAccountName} onChangeText={(value) => update("bankAccountName", value)} autoCapitalize="words" />
              <Field label="Bank Account Number" value={form.bankAccountNumber} onChangeText={(value) => update("bankAccountNumber", value)} keyboardType="number-pad" />
              <Field label="IFSC Code" value={form.bankIfsc} onChangeText={(value) => update("bankIfsc", value.toUpperCase())} autoCapitalize="characters" />
              <Field label="UPI ID" value={form.upiId} onChangeText={(value) => update("upiId", value)} autoCapitalize="none" />
              <Text style={styles.helper}>Your registration will be reviewed by the operations team before you can receive delivery requests.</Text>
            </>
          ) : null}

          <View style={styles.actions}>
            {step > 0 ? <Button title="Previous" variant="secondary" onPress={() => { setError(""); setStep((current) => current - 1); }} style={styles.flexButton} /> : null}
            <Button title={step === 3 ? "Submit Registration" : "Continue"} onPress={() => void advance()} loading={busy} style={styles.flexButton} />
          </View>
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.signin}>
            <Text style={styles.helper}>Already registered? </Text><Text style={styles.link}>Sign in</Text>
          </Pressable>
        </Card>
      </Page>
    </Screen>
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && styles.optionSelected]}>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { gap: 17 },
  back: { color: colors.muted, fontSize: 13, paddingVertical: 3 },
  stepper: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  step: { alignItems: "center", gap: 6 },
  stepCircle: { height: 34, width: 34, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  stepActive: { backgroundColor: colors.white, borderColor: colors.white },
  stepNumber: { color: colors.subtle, fontSize: 12, fontWeight: "700" },
  stepNumberActive: { color: colors.black },
  stepLabel: { color: colors.subtle, fontSize: 9 },
  stepLabelActive: { color: colors.foreground, fontWeight: "700" },
  card: { padding: 17, gap: 14, borderRadius: 24 },
  groupTitle: { color: "#d4d4d8", fontSize: 10, fontWeight: "700", letterSpacing: 0.8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600", marginTop: 1 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.02)", paddingHorizontal: 11, paddingVertical: 10 },
  optionSelected: { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.3)" },
  optionText: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  optionTextSelected: { color: colors.foreground },
  helper: { color: colors.subtle, fontSize: 10, lineHeight: 15 },
  actions: { flexDirection: "row", gap: 9, marginTop: 3 },
  flexButton: { flex: 1 },
  signin: { flexDirection: "row", justifyContent: "center", paddingVertical: 4 },
  link: { color: colors.foreground, fontSize: 10, fontWeight: "700" },
});
