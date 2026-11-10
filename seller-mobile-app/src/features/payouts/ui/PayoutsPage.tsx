import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { usePayouts } from '../hooks/usePayouts';
import { productService } from '@/features/products/services/productService';
import { ordersService } from '@/features/orders/services/ordersService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { IndianRupee, CheckCircle2, Clock, Landmark } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface PayoutsPageProps {
  navigation: any;
}

export function PayoutsPage({ navigation }: PayoutsPageProps) {
  const { payouts, pendingPayouts, completedPayouts, summary, isLoadingSummary } = usePayouts();
  const [tab, setTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const displayedPayouts =
    tab === 'ALL' ? payouts : tab === 'PENDING' ? pendingPayouts : completedPayouts;

  const cards = [
    {
      name: 'Gross Lifetime Revenue',
      value: productService.formatPrice(summary?.totalEarnings ?? 0),
      icon: IndianRupee,
      color: Colors.purpleLight,
    },
    {
      name: 'Settled Settlements',
      value: productService.formatPrice(summary?.totalPaid ?? 0),
      icon: CheckCircle2,
      color: Colors.emerald,
    },
    {
      name: 'Pending Balance',
      value: productService.formatPrice(summary?.totalPending ?? 0),
      icon: Clock,
      color: Colors.indigo,
    },
  ];

  return (
    <DashboardLayout title="Payouts" navigation={navigation} currentRoute="/payouts">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settlements &amp; Payouts</Text>
          <Text style={styles.subtitle}>
            Monitor your store earnings, check pending settlements, and review payout logs.
          </Text>
        </View>

        {/* Summary Cards */}
        {isLoadingSummary ? (
          <View style={{ gap: 10, marginBottom: 14 }}>
            <Skeleton height={70} borderRadius={14} />
            <Skeleton height={70} borderRadius={14} />
          </View>
        ) : (
          <View style={{ gap: 10, marginBottom: 14 }}>
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <View key={i} style={styles.summaryCard}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardName}>{card.name}</Text>
                    <Icon size={16} color={card.color} />
                  </View>
                  <Text style={styles.cardValue}>{card.value}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Payout History */}
        <Card>
          <CardHeader>
            <View style={styles.payoutHeaderRow}>
              <View>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>Direct deposit settlements</CardDescription>
              </View>
              <View style={styles.tabRow}>
                {(['ALL', 'PENDING', 'COMPLETED'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTab(t)}
                    style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                  >
                    <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </CardHeader>

          <CardContent style={{ padding: 12 }}>
            {displayedPayouts.length > 0 ? (
              displayedPayouts.map((p) => (
                <View key={p.id} style={styles.payoutItem}>
                  <View style={styles.payoutIconBox}>
                    <Landmark size={18} color={Colors.purpleLight} />
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.payoutAmount}>{productService.formatPrice(p.amount)}</Text>
                    <Text style={styles.payoutDate}>
                      {ordersService.formatDate(p.createdAt)}
                      {p.transactionRef ? ` • Ref: ${p.transactionRef}` : ''}
                    </Text>
                  </View>
                  <Badge variant={p.status === 'COMPLETED' ? 'success' : 'default'} style={{ paddingVertical: 1 }}>
                    {p.status}
                  </Badge>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No payout settlements found in this tab.</Text>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  payoutHeaderRow: {
    flexDirection: 'column',
    gap: 10,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabBtnActive: {
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
  },
  tabText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  tabTextActive: {
    color: Colors.purpleLight,
  },
  payoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  payoutIconBox: {
    height: 38,
    width: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  payoutDate: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
