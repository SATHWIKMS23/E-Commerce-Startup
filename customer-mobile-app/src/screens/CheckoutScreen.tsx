import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Truck,
  Ticket,
  Check,
  ShieldCheck,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { locationService, Address } from '../services/location.service';
import { productService } from '../services/product.service';
import { orderService } from '../services/order.service';
import axiosInstance from '../services/api.service';
import { API_ROUTES } from '../config/api';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const CheckoutScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cart, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  const buyNow = route.params?.buyNow;
  const buyNowProductId = route.params?.productId;
  const buyNowVariantId = route.params?.variantId;
  const buyNowQuantity = route.params?.quantity || 1;

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'PORTAL_DELIVERY' | 'SELF_DELIVERY'>('PORTAL_DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'RAZORPAY'>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Buy now item state
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);

  useEffect(() => {
    if (buyNow && buyNowProductId) {
      productService.getProductById(buyNowProductId).then(setBuyNowProduct).catch(() => {});
    }

    locationService
      .getAddresses()
      .then((addrs) => {
        setAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => {})
      .finally(() => setIsLoadingAddresses(false));
  }, [buyNow, buyNowProductId]);

  const activeAddress = addresses.find((a) => a.id === selectedAddressId) || addresses[0];

  const checkoutSubtotal = buyNow && buyNowProduct
    ? Number(buyNowProduct.price) * buyNowQuantity
    : subtotal;

  const shippingFee = deliveryMethod === 'PORTAL_DELIVERY' ? 40 : 0;
  const grandTotal = Math.max(0, checkoutSubtotal + shippingFee - couponDiscount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const res = await axiosInstance.post(API_ROUTES.checkout.applyCoupon, {
        code: couponCode.trim(),
      });
      const discount = res.data?.discount || 50;
      setCouponDiscount(discount);
      Alert.alert('Coupon Applied', `You saved ₹${discount}!`);
    } catch (err: any) {
      Alert.alert('Coupon Error', err.message || 'Invalid or expired coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!activeAddress) {
      Alert.alert('Missing Address', 'Please select or add a delivery address.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const payload: any = {
        shippingAddressId: activeAddress.id,
        deliveryMethod,
        paymentMethod,
        couponCode: couponCode.trim() || undefined,
      };

      if (buyNow && buyNowProductId) {
        payload.buyNow = true;
        payload.productId = buyNowProductId;
        payload.productVariantId = buyNowVariantId;
        payload.quantity = buyNowQuantity;
      }

      const orderRes = await orderService.createOrder(payload);

      if (paymentMethod === 'COD') {
        try {
          await axiosInstance.post(API_ROUTES.payments.cod, {
            orderId: orderRes.id,
          });
        } catch {
          // COD registered
        }
      }

      if (!buyNow) {
        await clearCart();
      }

      Alert.alert(
        'Order Placed!',
        `Order #${orderRes.orderNumber || orderRes.id} has been placed successfully.`,
        [
          {
            text: 'View Orders',
            onPress: () => navigation.replace('OrderHistory'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Checkout Failed', err.message || 'Could not place order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Checkout</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Shipping Address Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Shipping Address</Text>
          </View>

          {isLoadingAddresses ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
          ) : addresses.length > 0 ? (
            addresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id;
              return (
                <TouchableOpacity
                  key={addr.id}
                  onPress={() => setSelectedAddressId(addr.id)}
                  style={[styles.addrChoice, isSelected && styles.addrChoiceSelected]}
                >
                  <View style={styles.radio}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addrName}>{addr.fullName}</Text>
                    <Text style={styles.addrText}>
                      {addr.addressLine1}, {addr.city}, {addr.state} - {addr.postalCode}
                    </Text>
                    <Text style={styles.addrPhone}>Phone: {addr.phone}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={{ paddingVertical: 10 }}>
              <Text style={styles.emptyNotice}>No shipping addresses found.</Text>
            </View>
          )}
        </View>

        {/* Delivery Method */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Truck size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Delivery Method</Text>
          </View>

          <View style={styles.deliveryRow}>
            <TouchableOpacity
              onPress={() => setDeliveryMethod('PORTAL_DELIVERY')}
              style={[
                styles.deliveryOption,
                deliveryMethod === 'PORTAL_DELIVERY' && styles.deliveryOptionActive,
              ]}
            >
              <Text style={styles.deliveryTitle}>Platform Delivery</Text>
              <Text style={styles.deliverySub}>Fast local courier service (₹40.00)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDeliveryMethod('SELF_DELIVERY')}
              style={[
                styles.deliveryOption,
                deliveryMethod === 'SELF_DELIVERY' && styles.deliveryOptionActive,
              ]}
            >
              <Text style={styles.deliveryTitle}>Seller / Self Pickup</Text>
              <Text style={styles.deliverySub}>Pickup directly from maker (Free)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Method</Text>
          </View>

          <View style={styles.deliveryRow}>
            <TouchableOpacity
              onPress={() => setPaymentMethod('COD')}
              style={[styles.deliveryOption, paymentMethod === 'COD' && styles.deliveryOptionActive]}
            >
              <Text style={styles.deliveryTitle}>Cash on Delivery (COD)</Text>
              <Text style={styles.deliverySub}>Pay upon delivery at your doorstep</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPaymentMethod('RAZORPAY')}
              style={[
                styles.deliveryOption,
                paymentMethod === 'RAZORPAY' && styles.deliveryOptionActive,
              ]}
            >
              <Text style={styles.deliveryTitle}>Online (UPI / Cards / NetBanking)</Text>
              <Text style={styles.deliverySub}>Secured by Razorpay end-to-end</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Coupon Code Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ticket size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Have a Coupon?</Text>
          </View>
          <View style={styles.couponRow}>
            <TextInput
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder="Enter coupon code"
              placeholderTextColor={colors.foregroundDim}
              style={styles.couponInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              onPress={handleApplyCoupon}
              disabled={isApplyingCoupon}
              style={styles.couponBtn}
            >
              <Text style={styles.couponBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {couponDiscount > 0 && (
            <Text style={styles.couponSuccess}>✓ Coupon applied: -₹{couponDiscount}</Text>
          )}
        </View>

        {/* Order Price Summary */}
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>Price Breakdown</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Subtotal</Text>
            <Text style={styles.summaryVal}>{productService.formatPrice(checkoutSubtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping & Delivery</Text>
            <Text style={styles.summaryVal}>
              {shippingFee > 0 ? productService.formatPrice(shippingFee) : 'Free'}
            </Text>
          </View>
          {couponDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.success }]}>Coupon Discount</Text>
              <Text style={[styles.summaryVal, { color: colors.success }]}>
                -₹{couponDiscount}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalVal}>{productService.formatPrice(grandTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder}
          style={styles.placeOrderBtn}
          activeOpacity={0.8}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <ShieldCheck size={18} color={colors.primaryForeground} />
              <Text style={styles.placeOrderText}>
                Place Order • {productService.formatPrice(grandTotal)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '800',
  },
  addrChoice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  addrChoiceSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.foregroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  addrName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  addrText: {
    color: colors.foregroundMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  addrPhone: {
    color: colors.foregroundDim,
    fontSize: 10,
    marginTop: 2,
  },
  emptyNotice: {
    color: colors.foregroundDim,
    fontSize: 12,
  },
  deliveryRow: {
    gap: 8,
  },
  deliveryOption: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  deliveryOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  deliveryTitle: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  deliverySub: {
    color: colors.foregroundMuted,
    fontSize: 11,
    marginTop: 2,
  },
  couponRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.glassInputBg,
    borderWidth: 1,
    borderColor: colors.glassInputBorder,
    paddingHorizontal: 12,
    color: colors.foreground,
    fontSize: 13,
  },
  couponBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponBtnText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  couponSuccess: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  summaryTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    color: colors.foregroundMuted,
    fontSize: 12,
  },
  summaryVal: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    marginTop: 8,
    paddingTop: 8,
  },
  grandTotalLabel: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  grandTotalVal: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '900',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  placeOrderText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '900',
  },
});
