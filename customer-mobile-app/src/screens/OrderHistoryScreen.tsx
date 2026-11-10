import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Calendar,
  Package,
  IndianRupee,
  ChevronRight,
  ClipboardList,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { orderService, Order } from '../services/order.service';
import { productService } from '../services/product.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const OrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    orderService
      .getOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Order History</Text>
          <Text style={styles.subtitle}>
            Track active shipments, view invoices, or verify delivered packages.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : orders.length > 0 ? (
          orders.map((order) => {
            const totalItemsCount =
              order.sellerOrders?.reduce(
                (acc, so) => acc + so.items.reduce((sum, item) => sum + item.quantity, 0),
                0
              ) || 0;

            const badgeColor = orderService.getStatusBadgeColor(order.status);

            return (
              <TouchableOpacity
                key={order.id}
                onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
                style={styles.orderCard}
                activeOpacity={0.8}
              >
                {/* Header row */}
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: badgeColor.bg }]}>
                    <Text style={[styles.statusText, { color: badgeColor.text }]}>
                      {orderService.formatStatus(order.status)}
                    </Text>
                  </View>
                </View>

                {/* Badges row */}
                <View style={styles.badgesRow}>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagText}>
                      {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online / Razorpay'}
                    </Text>
                  </View>
                </View>

                {/* Details Row */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Calendar size={12} color={colors.foregroundMuted} />
                    <Text style={styles.metaText}>
                      {new Date(order.placedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Package size={12} color={colors.foregroundMuted} />
                    <Text style={styles.metaText}>
                      {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.totalText}>
                      {productService.formatPrice(order.grandTotal)}
                    </Text>
                  </View>
                </View>

                {/* Items summary */}
                <View style={styles.cardFooter}>
                  <Text style={styles.itemNames} numberOfLines={1}>
                    {order.sellerOrders?.flatMap((so) => so.items.map((it) => it.productName)).join(', ')}
                  </Text>
                  <ChevronRight size={14} color={colors.foregroundMuted} />
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <ClipboardList size={48} color={colors.foregroundDim} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>When you place an order, it will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.foregroundMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tagText: {
    color: colors.foregroundMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.foregroundMuted,
    fontSize: 11,
  },
  totalText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '900',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  itemNames: {
    color: colors.foregroundDim,
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    gap: 10,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: colors.foregroundMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
