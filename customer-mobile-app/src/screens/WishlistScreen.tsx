import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Heart, ShoppingCart, Trash2, Package, ArrowLeft } from 'lucide-react-native';
import { wishlistService, WishlistItem } from '../services/wishlist.service';
import { productService } from '../services/product.service';
import { useCart } from '../context/CartContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export const WishlistScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addToCart, setCartOpen } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWishlist = async () => {
    setIsLoading(true);
    try {
      const res = await wishlistService.getWishlist();
      setItems(res.items || []);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (id: string) => {
    try {
      await wishlistService.removeFromWishlist(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // Ignore
    }
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    try {
      await addToCart(item.productId, 1);
      await handleRemove(item.id);
      setCartOpen(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not move to cart');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>My Wishlist ({items.length})</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>My Wishlist</Text>
          <Text style={styles.subtitle}>
            Keep track of items you love and move them to your cart when ready.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : items.length > 0 ? (
          <View style={styles.grid}>
            {items.map((it) => {
              const prod = it.product;
              const isOutOfStock = (prod?.stockQuantity ?? 0) <= 0;

              return (
                <View key={it.id} style={styles.card}>
                  <View style={styles.imgWrap}>
                    {prod?.imageUrl ? (
                      <Image source={{ uri: prod.imageUrl }} style={styles.prodImg} />
                    ) : (
                      <Package size={28} color={colors.foregroundDim} />
                    )}
                    <TouchableOpacity
                      onPress={() => handleRemove(it.id)}
                      style={styles.trashBtn}
                    >
                      <Trash2 size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.info}>
                    <Text style={styles.prodName} numberOfLines={2}>
                      {prod?.name || 'Handcrafted Product'}
                    </Text>
                    <Text style={styles.prodPrice}>
                      {productService.formatPrice(prod?.price)}
                    </Text>

                    <TouchableOpacity
                      disabled={isOutOfStock}
                      onPress={() => handleMoveToCart(it)}
                      style={[styles.moveBtn, isOutOfStock && { opacity: 0.5 }]}
                    >
                      <ShoppingCart size={13} color={colors.primaryForeground} />
                      <Text style={styles.moveBtnText}>
                        {isOutOfStock ? 'Out of Stock' : 'Move to Cart'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Heart size={48} color={colors.foregroundDim} />
            <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
            <Text style={styles.emptySub}>Save items you want to keep an eye on.</Text>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: (width - 44) / 2,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  imgWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  prodImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trashBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 10,
    gap: 6,
  },
  prodName: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
    minHeight: 32,
  },
  prodPrice: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  moveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  moveBtnText: {
    color: colors.primaryForeground,
    fontSize: 11,
    fontWeight: '800',
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
  },
});
