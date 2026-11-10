import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { productService } from '../services/product.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cart, cartCount, subtotal, updateQuantity, removeItem, isLoading } = useCart();

  return (
    <View style={styles.container}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>My Cart ({cartCount})</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : cart.items.length > 0 ? (
          cart.items.map((item) => {
            const basePrice = Number(item.product?.price || 0);
            const varDiff = item.variant ? Number(item.variant.priceDifference || 0) : 0;
            const itemPrice = basePrice + varDiff;

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.imageBox}>
                  {item.product?.imageUrl ? (
                    <Image source={{ uri: item.product.imageUrl }} style={styles.itemImg} />
                  ) : (
                    <Package size={24} color={colors.foregroundDim} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product?.name}
                  </Text>
                  {item.variant && (
                    <Text style={styles.itemVariant}>Option: {item.variant.name}</Text>
                  )}
                  <Text style={styles.itemPrice}>
                    {productService.formatPrice(itemPrice)}
                  </Text>

                  <View style={styles.qtyRow}>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        style={styles.qtyBtn}
                      >
                        <Minus size={12} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        style={styles.qtyBtn}
                      >
                        <Plus size={12} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      style={styles.trashBtn}
                    >
                      <Trash2 size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <ShoppingCart size={48} color={colors.foregroundDim} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySub}>Add some items from shops to proceed to checkout.</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      {cart.items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>{productService.formatPrice(subtotal)}</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Checkout')}
            style={styles.checkoutBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            <ArrowRight size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
    gap: 12,
  },
  imageBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  itemVariant: {
    color: colors.foregroundMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  itemPrice: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qtyText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
  },
  trashBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
    maxWidth: 240,
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
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtotalLabel: {
    color: colors.foregroundMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  subtotalValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '900',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  checkoutText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '800',
  },
});
