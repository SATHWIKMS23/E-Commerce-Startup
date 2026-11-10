import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ShoppingCart, X, Plus, Minus, Trash2, Package, ArrowRight } from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { productService } from '../services/product.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const CartModal: React.FC = () => {
  const {
    cart,
    cartCount,
    subtotal,
    cartOpen,
    setCartOpen,
    updateQuantity,
    removeItem,
    isLoading,
  } = useCart();

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleCheckout = () => {
    setCartOpen(false);
    navigation.navigate('Checkout', undefined);
  };

  return (
    <Modal
      visible={cartOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setCartOpen(false)}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setCartOpen(false)}
        />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ShoppingCart size={18} color={colors.primary} />
              <Text style={styles.title}>Your Cart</Text>
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setCartOpen(false)} style={styles.closeBtn}>
              <X size={20} color={colors.foregroundMuted} />
            </TouchableOpacity>
          </View>

          {/* Cart Items List */}
          <ScrollView style={styles.itemsScroll} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : cart.items.length > 0 ? (
              cart.items.map((item) => {
                const basePrice = Number(item.product?.price || 0);
                const varDiff = item.variant ? Number(item.variant.priceDifference || 0) : 0;
                const itemPrice = basePrice + varDiff;

                return (
                  <View key={item.id} style={styles.itemCard}>
                    {/* Thumbnail */}
                    <View style={styles.imageBox}>
                      {item.product?.imageUrl ? (
                        <Image source={{ uri: item.product.imageUrl }} style={styles.itemImage} />
                      ) : (
                        <Package size={24} color={colors.foregroundDim} />
                      )}
                    </View>

                    {/* Details */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.product?.name}
                      </Text>
                      {item.variant && (
                        <Text style={styles.itemVariant}>
                          Option: {item.variant.name}
                        </Text>
                      )}
                      <Text style={styles.itemPrice}>
                        {productService.formatPrice(itemPrice)}
                      </Text>

                      {/* Quantity Controls */}
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
                          <Trash2 size={15} color={colors.destructive} />
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
                <Text style={styles.emptySub}>
                  Explore products and unique handcrafted items to get started.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Subtotal & Checkout CTA */}
          {cart.items.length > 0 && (
            <View style={styles.footer}>
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>{productService.formatPrice(subtotal)}</Text>
              </View>
              <Text style={styles.taxNotice}>Taxes and delivery calculated at checkout</Text>

              <TouchableOpacity
                onPress={handleCheckout}
                style={styles.checkoutBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                <ArrowRight size={16} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  itemsScroll: {
    padding: 16,
    maxHeight: 380,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
    gap: 12,
  },
  imageBox: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: {
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
    textTransform: 'uppercase',
  },
  itemPrice: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '800',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    paddingVertical: 50,
    gap: 8,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    color: colors.foregroundDim,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subtotalLabel: {
    color: colors.foregroundMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  subtotalValue: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '900',
  },
  taxNotice: {
    color: colors.foregroundDim,
    fontSize: 10,
    marginBottom: 12,
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
