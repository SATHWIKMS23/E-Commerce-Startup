import React, { useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiClient, getErrorMessage } from "../api";
import { BrandHeader, Card, Loading, Metric, Page, Screen, Title, currencyFromPaise } from "../components/ui";
import { colors } from "../theme";

type Payout = {
  id: string;
  payoutNumber: string;
  amountPaise: number;
  status: string;
  bankReference?: string;
  processedAt?: string;
  createdAt: string;
};

type Earnings = {
  todayEarningsPaise: number;
  weeklyEarningsPaise: number;
  monthlyEarningsPaise: number;
  totalLifetimePaise: number;
  pendingPayoutPaise: number;
  completedCount: number;
  payoutsHistory: Payout[];
};

const empty: Earnings = {
  todayEarningsPaise: 0,
  weeklyEarningsPaise: 0,
  monthlyEarningsPaise: 0,
  totalLifetimePaise: 0,
  pendingPayoutPaise: 0,
  completedCount: 0,
  payoutsHistory: [],
};

export function EarningsScreen() {
  const { rider } = useAuth();
  const [earnings, setEarnings] = useState<Earnings>(empty);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchEarnings = async () => {
    try {
      const { data } = await apiClient.get("/api/delivery/earnings");
      if (data?.earnings) {
        const payload = data.earnings;
        setEarnings({
          ...empty,
          ...payload,
          completedCount: Number(payload.completedCount ?? payload.completedTripsCount ?? 0),
          payoutsHistory: Array.isArray(payload.payoutsHistory)
            ? payload.payoutsHistory
            : Array.isArray(payload.payoutHistory) ? payload.payoutHistory : [],
        });
      }
      setError("");
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not load earnings."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void fetchEarnings(); }, []);
  if (loading) return <Loading label="Loading earnings and payout ledger..." />;

  return (
    <Screen>
      <BrandHeader />
      <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchEarnings(); }} tintColor={colors.foreground} />}>
        <Title subtitle="Review completed trips, pending balance and direct bank transfers.">Earnings & Payouts</Title>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Card style={styles.hero}>
          <Text style={styles.eyebrow}>PENDING DISBURSAL</Text>
          <Text style={styles.heroAmount}>{currencyFromPaise(earnings.pendingPayoutPaise)}</Text>
          <Text style={styles.description}>Earnings from completed orders, scheduled for electronic bank settlement.</Text>
          <View style={styles.total}>
            <Text style={styles.eyebrow}>LIFETIME TOTAL EARNED</Text>
            <Text style={styles.totalAmount}>{currencyFromPaise(earnings.totalLifetimePaise)}</Text>
            <Text style={styles.description}>{earnings.completedCount} completed deliveries</Text>
          </View>
        </Card>
        <View style={styles.metrics}>
          <Metric label="Today" value={currencyFromPaise(earnings.todayEarningsPaise)} caption="Midnight to now" />
          <Metric label="This Week" value={currencyFromPaise(earnings.weeklyEarningsPaise)} caption="Current cycle week" />
          <Metric label="This Month" value={currencyFromPaise(earnings.monthlyEarningsPaise)} caption="Monthly cumulative" />
        </View>
        <Card style={styles.bank}>
          <Text style={styles.cardTitle}>Payout Destination Bank Account</Text>
          <Text style={styles.description}>Electronic NEFT/IMPS direct settlement</Text>
          <View style={styles.divider} />
          <BankValue label="Account Holder" value={rider?.bankAccountHolderName || `${rider?.firstName || ""} ${rider?.lastName || ""}`.trim() || "Not provided"} />
          <BankValue label="Bank Name" value={rider?.bankName || "Not provided"} />
          <BankValue label="Account & IFSC" value={`••••${rider?.bankAccountNumber?.slice(-4) || "XXXX"} · ${rider?.bankIfsc || "IFSC not provided"}`} />
        </Card>
        <View style={{ gap: 10 }}>
          <View style={styles.ledgerTitle}>
            <Text style={styles.cardTitle}>Bank Disbursal History</Text>
            <Text style={styles.eyebrow}>OFFICIAL UTR REFERENCES</Text>
          </View>
          {earnings.payoutsHistory.length === 0 ? (
            <Card style={styles.empty}><Text style={styles.description}>No bank transfer records yet. Settlements will appear here with their bank references.</Text></Card>
          ) : earnings.payoutsHistory.map((payout) => (
            <Card key={payout.id} style={styles.payoutRow}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.cardTitle}>{payout.payoutNumber}</Text>
                <Text style={styles.description}>{payout.status} · {new Date(payout.processedAt || payout.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</Text>
                {payout.bankReference ? <Text style={styles.ref}>Bank UTR: {payout.bankReference}</Text> : null}
              </View>
              <Text style={styles.payoutAmount}>{currencyFromPaise(payout.amountPaise)}</Text>
            </Card>
          ))}
        </View>
      </Page>
    </Screen>
  );
}

function BankValue({ label, value }: { label: string; value: string }) {
  return <View style={styles.bankRow}><Text style={styles.description}>{label}</Text><Text style={styles.bankValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  error: { padding: 11, borderRadius: 11, color: colors.red, backgroundColor: colors.redBg, fontSize: 11 },
  hero: { gap: 8, padding: 20 },
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 0.7 },
  heroAmount: { color: colors.foreground, fontSize: 34, fontWeight: "700", letterSpacing: -1 },
  description: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  total: { gap: 5, marginTop: 9, borderRadius: 15, padding: 13, backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: colors.border },
  totalAmount: { color: colors.foreground, fontSize: 21, fontWeight: "700" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  bank: { gap: 10 },
  cardTitle: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  bankRow: { gap: 4 },
  bankValue: { color: "#e4e4e7", fontSize: 11, fontWeight: "600" },
  ledgerTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  empty: { alignItems: "center", paddingVertical: 22 },
  payoutRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15 },
  ref: { color: colors.subtle, fontSize: 9, fontVariant: ["tabular-nums"] },
  payoutAmount: { color: colors.foreground, fontSize: 15, fontWeight: "700" },
});
