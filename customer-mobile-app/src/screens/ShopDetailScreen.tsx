import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  Store,
  Package,
  Star,
} from 'lucide-react-native';
import { shopService, Shop } from '../services/shop.service';
import { productService, Product } from '../services/product.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export const ShopDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { shopId } = route.params;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    shopService
      .getShopDetails(shopId)
      .then((data: any) => {
        setShop(data);
        setProducts(data.products || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [shopId]);

  if (isLoading || !shop) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const filteredProducts = selectedCat
    ? products.filter((p) => p.categoryId === selectedCat)
    : products;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle} numberOfLines={1}>
          {shop.name}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.bannerWrap}>
          {shop.bannerUrl ? (
            <Image source={{ uri: shop.bannerUrl }} style={styles.bannerImg} />
          ) : (
            <View style={styles.bannerPlaceholder} />
          )}
        </View>

        {/* Logo and Shop Header */}
        <View style={styles.headerInfo}>
          <View style={styles.logoWrap}>
            {shop.logoUrl ? (
              <Image source={{ uri: shop.logoUrl }} style={styles.logoImg} />
            ) : (
              <Store size={26} color={colors.foreground} />
            )}
          </View>

          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopDesc}>{shop.description || 'Verified local creator.'}</Text>

          {/* Contact & Location Chips */}
          <View style={styles.chipsRow}>
            {shop.defaultPickupAddress && (
              <View style={styles.infoChip}>
                <MapPin size={11} color={colors.foregroundMuted} />
                <Text style={styles.infoChipText}>
                  {shop.defaultPickupAddress.city}, {shop.defaultPickupAddress.state}
                </Text>
              </View>
            )}
            {shop.supportEmail ? (
              <View style={styles.infoChip}>
                <Mail size={11} color={colors.foregroundMuted} />
                <Text style={styles.infoChipText}>{shop.supportEmail}</Text>
              </View>
            ) : null}
            {shop.supportPhone ? (
              <View style={styles.infoChip}>
                <Phone size={11} color={colors.foregroundMuted} />
                <Text style={styles.infoChipText}>{shop.supportPhone}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Shop Products ({filteredProducts.length})</Text>

          <View style={styles.productsGrid}>
            {filteredProducts.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                style={styles.productCard}
                activeOpacity={0.8}
              >
                <View style={styles.prodThumb}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.prodImg} />
                  ) : (
                    <Package size={26} color={colors.foregroundDim} />
                  )}
                </View>
                <View style={styles.prodInfo}>
                  <Text style={styles.prodTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.prodPrice}>
                    {productService.formatPrice(item.price)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  bannerWrap: {
    height: 140,
    backgroundColor: '#18181b',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1f1f23',
  },
  headerInfo: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#000',
    borderWidth: 3,
    borderColor: colors.card,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shopName: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '900',
  },
  shopDesc: {
    color: colors.foregroundMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoChipText: {
    color: colors.foregroundMuted,
    fontSize: 11,
  },
  productsSection: {
    padding: 16,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 8,
  },
  prodThumb: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  prodInfo: {
    padding: 10,
    gap: 4,
  },
  prodTitle: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
    minHeight: 32,
  },
  prodPrice: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '900',
  },
});
