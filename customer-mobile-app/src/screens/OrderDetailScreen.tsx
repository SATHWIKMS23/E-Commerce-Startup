import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Store,
  CreditCard,
  MessageSquare,
} from 'lucide-react-native';
import { orderService, Order } from '../services/order.service';
import { productService } from '../services/product.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const OrderDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    orderService
      .getOrderById(orderId)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [orderId]);

  if (isLoading || !order) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const badgeColor = orderService.getStatusBadgeColor(order.status);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle} numberOfLines={1}>
          Order #{order.orderNumber}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.orderLabel}>Order Status</Text>
              <Text style={styles.orderDate}>
                Placed on {new Date(order.placedAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badgeColor.bg }]}>
              <Text style={[styles.statusText, { color: badgeColor.text }]}>
                {orderService.formatStatus(order.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Ordered Items by Seller */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ordered Items</Text>
          {order.sellerOrders?.map((so) => (
            <View key={so.id} style={styles.sellerSection}>
              <View style={styles.sellerRow}>
                <Store size={14} color={colors.foregroundMuted} />
                <Text style={styles.sellerName}>{so.shopName || 'Local Seller'}</Text>
              </View>

              {so.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    {item.variantName ? (
                      <Text style={styles.variantName}>Option: {item.variantName}</Text>
                    ) : null}
                    <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    {productService.formatPrice(item.totalPrice)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        {order.shippingAddress && (
          <View style={styles.card}>
            <View style={styles.headerWithIcon}>
              <MapPin size={16} color={colors.primary} />
              <Text style={styles.cardTitle}>Delivery Address</Text>
            </View>
            <Text style={styles.addrName}>{order.shippingAddress.fullName}</Text>
            <Text style={styles.addrText}>
              {order.shippingAddress.addressLine1}, {order.shippingAddress.city},{' '}
              {order.shippingAddress.state} - {order.shippingAddress.postalCode}
            </Text>
            <Text style={styles.addrPhone}>Phone: {order.shippingAddress.phone}</Text>
          </View>
        )}

        {/* Payment Summary */}
        <View style={styles.card}>
          <View style={styles.headerWithIcon}>
            <CreditCard size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Details</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Payment Mode</Text>
            <Text style={styles.priceVal}>
              {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online'}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Items Subtotal</Text>
            <Text style={styles.priceVal}>{productService.formatPrice(order.subtotal)}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Shipping</Text>
            <Text style={styles.priceVal}>{productService.formatPrice(order.shippingTotal)}</Text>
          </View>

          {Number(order.discountTotal) > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.success }]}>Discount</Text>
              <Text style={[styles.priceVal, { color: colors.success }]}>
                -{productService.formatPrice(order.discountTotal)}
              </Text>
            </View>
          )}

          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalVal}>{productService.formatPrice(order.grandTotal)}</Text>
          </View>
        </View>

        {/* Need Help CTA */}
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('SupportChat', {
              orderId: order.id,
              category: 'Order Issue',
            })
          }
          style={styles.helpBtn}
          activeOpacity={0.8}
        >
          <MessageSquare size={16} color={colors.foreground} />
          <Text style={styles.helpBtnText}>Need Help with this Order?</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  backBtn: {
    padding: 6,
  },
  topNavTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderLabel: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  orderDate: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  sellerSection: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sellerName: {
    color: colors.foregroundMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  itemName: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  variantName: {
    color: colors.foregroundMuted,
    fontSize: 10,
  },
  itemQty: {
    color: colors.foregroundDim,
    fontSize: 11,
    marginTop: 2,
  },
  itemPrice: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '800',
  },
  headerWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  addrName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  addrText: {
    color: colors.foregroundMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 18,
  },
  addrPhone: {
    color: colors.foregroundDim,
    fontSize: 11,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLabel: {
    color: colors.foregroundMuted,
    fontSize: 12,
  },
  priceVal: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  totalVal: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '900',
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  helpBtnText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
});
