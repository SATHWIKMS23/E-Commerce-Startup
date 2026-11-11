import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Bike, Truck } from "lucide-react-native";
import { colors, spacing } from "../theme";
import { useDeliverySettings } from "../settings/DeliverySettingsContext";

export function Screen({ children, style, ...props }: ViewProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={[styles.screen, style]} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function Page({ children, style, contentContainerStyle, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[styles.page, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewProps["style"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === "primary" ? colors.black : colors.foreground} /> : icon}
      <Text style={[styles.buttonText, variant !== "primary" && styles.secondaryButtonText]}>{title}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  leftIcon,
  containerStyle,
  ...props
}: TextInputProps & { label: string; error?: string; leftIcon?: React.ReactNode; containerStyle?: ViewProps["style"] }) {
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        {leftIcon ? <View style={styles.inputIcon}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor="#62626b"
          selectionColor={colors.foreground}
          style={[styles.input, leftIcon ? styles.inputWithIcon : undefined, props.multiline && styles.multiline, error && styles.inputError]}
          {...props}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Label({ children, style }: React.PropsWithChildren<{ style?: ViewProps["style"] }>) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Title({ children, subtitle }: React.PropsWithChildren<{ subtitle?: string }>) {
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Message({ children, tone = "error" }: React.PropsWithChildren<{ tone?: "error" | "success" | "warning" | "info" }>) {
  const color = tone === "success" ? colors.green : tone === "warning" ? colors.amber : tone === "info" ? colors.blue : colors.red;
  const background = tone === "success" ? colors.greenBg : tone === "warning" ? colors.amberBg : tone === "info" ? colors.blueBg : colors.redBg;
  return <Text style={[styles.message, { color, backgroundColor: background }]}>{children}</Text>;
}

export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.foreground} size="large" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function BrandHeader({
  title = "AtlasBasket Delivery",
  right,
}: {
  title?: string;
  right?: React.ReactNode;
}) {
  const { settings } = useDeliverySettings();
  const brandName = settings?.brandName || title;
  const tagline = settings?.brandTagline || "LOCAL DELIVERY FLEET";

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <BrandLogo size={34} />
        <View>
          <Text style={styles.brandTitle}>{brandName}</Text>
          <Text style={styles.brandSubtitle}>{tagline}</Text>
        </View>
      </View>
      {right}
    </View>
  );
}

export function BrandLogo({ size = 28 }: { size?: number }) {
  const { settings } = useDeliverySettings();
  const logoUrl = settings?.brandLogoUrl?.trim();
  const [logoFailed, setLogoFailed] = React.useState(false);
  React.useEffect(() => setLogoFailed(false), [logoUrl]);

  if (logoUrl && !logoFailed) {
    return (
      <Image
        source={{ uri: logoUrl }}
        onError={() => setLogoFailed(true)}
        style={[styles.brandImage, { width: size, height: size, borderRadius: size * 0.26 }]}
      />
    );
  }
  return (
    <View style={[styles.logoFallback, { width: size, height: size, borderRadius: size * 0.32 }]}>
      <Truck size={size * 0.5} color={colors.foreground} />
    </View>
  );
}

export function BackLink({ onPress, label = "Back" }: { onPress: () => void; label?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.backLink}>
      <ArrowLeft size={16} color={colors.muted} />
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

export function Metric({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </Card>
  );
}

export function BrandMark() {
  return (
    <View style={styles.brandMark}>
      <Bike size={21} color={colors.foreground} />
    </View>
  );
}

export function currencyFromPaise(amount?: number): string {
  return `₹${((amount ?? 0) / 100).toFixed(2)}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  page: { padding: spacing.page, paddingBottom: 34, gap: 16 },
  card: {
    padding: spacing.card,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 18,
  },
  buttonSecondary: {
    backgroundColor: colors.cardStrong,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  buttonDanger: {
    backgroundColor: colors.redBg,
    borderWidth: 1,
    borderColor: "rgba(244,63,94,0.25)",
  },
  buttonDisabled: { opacity: 0.48 },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: colors.black, fontSize: 13, fontWeight: "700" },
  secondaryButtonText: { color: colors.foreground },
  fieldWrap: { gap: 7 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  input: {
    minHeight: 46,
    paddingHorizontal: 13,
    color: colors.foreground,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    fontSize: 13,
  },
  inputWrap: { position: "relative", justifyContent: "center" },
  inputIcon: { position: "absolute", left: 13, zIndex: 1 },
  inputWithIcon: { paddingLeft: 39 },
  multiline: { minHeight: 82, paddingTop: 12, textAlignVertical: "top" },
  inputError: { borderColor: "rgba(244,63,94,0.45)" },
  errorText: { color: colors.red, fontSize: 11 },
  titleWrap: { gap: 5 },
  title: { color: colors.foreground, fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  message: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: 12, fontSize: 12, lineHeight: 18, overflow: "hidden" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.background },
  loadingText: { color: colors.muted, fontSize: 12 },
  header: {
    paddingHorizontal: spacing.page,
    paddingVertical: 11,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "rgba(7,7,10,0.96)",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandImage: { resizeMode: "contain" },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardStrong,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  brandTitle: { color: colors.foreground, fontSize: 12, fontWeight: "700" },
  brandSubtitle: { color: colors.subtle, fontSize: 8, letterSpacing: 0.8, marginTop: 2 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", paddingVertical: 5 },
  backText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  metric: { flex: 1, minWidth: "45%", gap: 8, padding: 14, borderRadius: 17 },
  metricLabel: { color: colors.muted, fontSize: 9, fontWeight: "600", letterSpacing: 0.7 },
  metricValue: { color: colors.foreground, fontSize: 19, fontWeight: "700" },
  caption: { color: colors.subtle, fontSize: 10, lineHeight: 14 },
  brandMark: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.cardStrong, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
});
