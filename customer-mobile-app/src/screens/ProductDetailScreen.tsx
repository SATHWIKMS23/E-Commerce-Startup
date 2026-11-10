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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  Star,
  Store,
  Check,
  Package,
  Zap,
} from 'lucide-react-native';
import { productService, Product, Review } from '../services/product.service';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { wishlistService } from '../services/wishlist.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const ProductDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { productId } = route.params;

  const { isAuthenticated } = useAuth();
  const { addToCart, setCartOpen } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    Promise.all([
      productService.getProductById(productId),
      productService.getProductReviews(productId).catch(() => []),
    ])
      .then(([prod, revs]) => {
        setProduct(prod);
        setReviews(revs);
        if (prod.variants && prod.variants.length > 0) {
          setSelectedVariantId(prod.variants[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [productId]);

  const selectedVariant = product?.variants?.find((v) => v.id === selectedVariantId);
  const finalPrice =
    Number(product?.price || 0) + (selectedVariant ? Number(selectedVariant.priceDifference) : 0);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (!product) return;

    setIsAdding(true);
    try {
      await addToCart(product.id, quantity, selectedVariantId || undefined);
      setCartOpen(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (!product) return;

    navigation.navigate('Checkout', {
      buyNow: true,
      productId: product.id,
      variantId: selectedVariantId || undefined,
      quantity,
    });
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (!product) return;

    try {
      if (isWishlisted) {
        await wishlistService.removeFromWishlist(product.id);
        setIsWishlisted(false);
      } else {
        await wishlistService.addToWishlist(product.id);
        setIsWishlisted(true);
      }
    } catch {
      // Ignore
    }
  };

  if (isLoading || !product) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity onPress={handleToggleWishlist} style={styles.wishlistNavBtn}>
          <Heart
            size={20}
            color={isWishlisted ? colors.destructive : colors.foreground}
            fill={isWishlisted ? colors.destructive : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Main Product Image */}
        <View style={styles.imageBox}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.productImg} />
          ) : (
            <Package size={64} color={colors.foregroundDim} />
          )}
        </View>

        {/* Shop Header Link */}
        {product.shop && (
          <TouchableOpacity
            onPress={() => navigation.navigate('ShopDetail', { shopId: product.shop?.slug || product.shop?.id || '' })}
            style={styles.shopRow}
            activeOpacity={0.7}
          >
            <Store size={15} color={colors.foregroundMuted} />
            <Text style={styles.shopName}>{product.shop.name}</Text>
          </TouchableOpacity>
        )}

        {/* Title & Price */}
        <Text style={styles.title}>{product.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{productService.formatPrice(finalPrice)}</Text>
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>
              {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>

        {/* Variants Selector */}
        {product.variants && product.variants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Options / Variants</Text>
            <View style={styles.variantsWrap}>
              {product.variants.map((v) => {
                const isSelected = selectedVariantId === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setSelectedVariantId(v.id)}
                    style={[styles.variantChip, isSelected && styles.variantChipActive]}
                  >
                    <Text style={[styles.variantChipText, isSelected && styles.variantChipTextActive]}>
                      {v.name} {Number(v.priceDifference) > 0 && `(+${productService.formatPrice(v.priceDifference)})`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.descText}>
            {product.description || 'Handcrafted item designed with high quality local materials.'}
          </Text>
        </View>

        {/* Customer Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Customer Reviews ({reviews.length})</Text>
          {reviews.length > 0 ? (
            reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>
                    {rev.user?.firstName || 'Verified Customer'}
                  </Text>
                  <View style={styles.starsRow}>
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} size={11} color="#eab308" fill="#eab308" />
                    ))}
                  </View>
                </View>
                {rev.comment ? (
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.noReviews}>No reviews written yet.</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleAddToCart}
          disabled={isAdding || product.stockQuantity <= 0}
          style={styles.cartBtn}
          activeOpacity={0.8}
        >
          <ShoppingCart size={16} color={colors.foreground} />
          <Text style={styles.cartBtnText}>Add to Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleBuyNow}
          disabled={product.stockQuantity <= 0}
          style={styles.buyBtn}
          activeOpacity={0.8}
        >
          <Zap size={16} color={colors.primaryForeground} />
          <Text style={styles.buyBtnText}>Buy Now</Text>
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
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  wishlistNavBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  imageBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  productImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  shopName: {
    color: colors.foregroundMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceText: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '900',
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  stockText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  sectionLabel: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  variantsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  variantChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  variantChipText: {
    color: colors.foregroundMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  variantChipTextActive: {
    color: colors.primaryForeground,
  },
  descText: {
    color: colors.foregroundMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  reviewCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    color: colors.foregroundMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  noReviews: {
    color: colors.foregroundDim,
    fontSize: 12,
    fontStyle: 'italic',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  cartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cartBtnText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '800',
  },
  buyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  buyBtnText: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontWeight: '900',
  },
});
