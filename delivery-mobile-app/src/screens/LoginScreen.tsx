import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useIdTokenAuthRequest } from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Bike, LockKeyhole, Mail } from "lucide-react-native";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, Field, Loading, Page, Screen, Title } from "../components/ui";
import { colors } from "../theme";
import type { RootStackParamList } from "../types";

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  const platformClientId = Platform.OS === "ios" ? iosClientId : androidClientId;
  const [request, response, promptGoogle] = useIdTokenAuthRequest({
    webClientId: clientId,
    iosClientId,
    androidClientId,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const credential = response.params.id_token;
    if (!credential) {
      setError("Google did not return an ID token. Check your OAuth configuration.");
      return;
    }
    let active = true;
    setBusy(true);
    signInWithGoogle(credential)
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Google sign-in failed."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [response, signInWithGoogle]);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const startGoogle = async () => {
    if (!clientId || !platformClientId) {
      setError("Add the Google web and device-specific OAuth client IDs to .env before signing in with Google.");
      return;
    }
    try {
      const result = await promptGoogle();
      if (result.type === "error") setError(result.error?.message || "Google sign-in was not completed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open Google sign-in.");
    }
  };

  return (
    <Screen>
      <Page contentContainerStyle={styles.page}>
        <Pressable onPress={() => navigation.goBack()} style={styles.brand}>
          <View style={styles.brandIcon}><Bike size={21} color={colors.foreground} /></View>
          <View>
            <Text style={styles.brandName}>AtlasBasket</Text>
            <Text style={styles.brandRole}>RIDER PORTAL</Text>
          </View>
        </Pressable>
        <Title subtitle="Deliver locally and earn directly with fast weekly payouts.">Sign in to your rider account</Title>

        <Card style={styles.form}>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Button
            title="Sign in with Google"
            variant="secondary"
            onPress={() => void startGoogle()}
            disabled={!request || busy}
            loading={busy && response?.type === "success"}
          />
          <View style={styles.divider}>
            <View style={styles.rule} />
            <Text style={styles.or}>OR WITH EMAIL</Text>
            <View style={styles.rule} />
          </View>
          <Field label="Email Address" value={email} onChangeText={setEmail} placeholder="rider@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" leftIcon={<Mail size={15} color={colors.subtle} />} />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry autoComplete="password" leftIcon={<LockKeyhole size={15} color={colors.subtle} />} />
          <Button title="Sign In" onPress={() => void submit()} loading={busy && response?.type !== "success"} disabled={!email.trim() || !password} />
        </Card>
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Don't have an account? </Text>
          <Pressable onPress={() => navigation.navigate("Register")}><Text style={styles.link}>Register as a rider</Text></Pressable>
        </View>
        <Pressable onPress={() => Alert.alert("Password help", "Please contact AtlasBasket Delivery support to reset your account password.")}>
          <Text style={styles.help}>Forgot your password?</Text>
        </Pressable>
      </Page>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, gap: 20 },
  brand: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 11, marginBottom: 2 },
  brandIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.cardStrong, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  brandName: { color: colors.foreground, fontSize: 19, fontWeight: "700" },
  brandRole: { color: colors.subtle, fontSize: 9, letterSpacing: 1.1, marginTop: 1 },
  form: { padding: 19, gap: 16, borderRadius: 25 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.subtle, fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  error: { color: colors.red, backgroundColor: colors.redBg, borderRadius: 12, padding: 12, fontSize: 11, lineHeight: 16 },
  switchRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap" },
  switchText: { color: colors.muted, fontSize: 11 },
  link: { color: colors.foreground, fontSize: 11, fontWeight: "700" },
  help: { color: colors.muted, textAlign: "center", fontSize: 11 },
});
