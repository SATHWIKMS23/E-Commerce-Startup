import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, MapPin, Store, ChevronRight, X } from 'lucide-react-native';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { FloatingSupportButton } from '../components/FloatingSupportButton';
import { shopService, Shop } from '../services/shop.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

const DEFAULT_SHOPS: Shop[] = [
  {
    id: 'cmrek8jw7001rcn21mhcpm3gb',
    name: 'Tester-Shop',
    slug: 'shoper',
    description: 'A shop created for testing',
    defaultPickupAddress: {
      city: 'Mysuru',
      state: 'Karnataka',
    },
  },
];

export const ShopsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [shops, setShops] = useState<Shop[]>(DEFAULT_SHOPS);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadShops = async () => {
    setIsLoading(true);
    try {
      const res = await shopService.getShops({
        search: search.trim() || undefined,
        limit: 20,
      });
      if (res.shops && res.shops.length > 0) {
        setShops(res.shops);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.introSection}>
          <Text style={styles.heading}>Explore Local Shops</Text>
          <Text style={styles.subheading}>
            Browse independent local artisans, maker workshops, and verified neighborhood stores.
          </Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={16} color={colors.foregroundDim} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search shops by name..."
            placeholderTextColor={colors.foregroundDim}
            style={styles.searchInput}
            onSubmitEditing={loadShops}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadShops(); }}>
              <X size={16} color={colors.foregroundMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Shops List */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : shops.length > 0 ? (
          shops.map((shop) => (
            <TouchableOpacity
              key={shop.id}
              onPress={() => navigation.navigate('ShopDetail', { shopId: shop.slug || shop.id })}
              style={styles.shopCard}
              activeOpacity={0.8}
            >
              {/* Banner */}
              <View style={styles.bannerWrap}>
                {shop.bannerUrl ? (
                  <Image source={{ uri: shop.bannerUrl }} style={styles.bannerImg} />
                ) : (
                  <LinearGradient
                    colors={['#1e3a8a', '#3b0764']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                {shop.defaultPickupAddress && (
                  <View style={styles.locationBadge}>
                    <MapPin size={10} color={colors.foreground} />
                    <Text style={styles.locationBadgeText}>
                      {shop.defaultPickupAddress.city}, {shop.defaultPickupAddress.state}
                    </Text>
                  </View>
                )}
              </View>

              {/* Logo Bridge */}
              <View style={styles.logoWrap}>
                {shop.logoUrl ? (
                  <Image source={{ uri: shop.logoUrl }} style={styles.logoImg} />
                ) : (
                  <Store size={22} color={colors.foregroundDim} />
                )}
              </View>

              {/* Details */}
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <Text style={styles.shopDesc} numberOfLines={2}>
                  {shop.description || 'Premium local craft maker.'}
                </Text>

                <View style={styles.footerRow}>
                  <Text style={styles.browseText}>View Shop Products</Text>
                  <ChevronRight size={14} color={colors.foregroundMuted} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Store size={44} color={colors.foregroundDim} />
            <Text style={styles.emptyText}>No shops found.</Text>
          </View>
        )}

        <Footer />
      </ScrollView>

      <FloatingSupportButton />
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
  introSection: {
    marginBottom: 16,
  },
  heading: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: '900',
  },
  subheading: {
    color: colors.foregroundMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.glassInputBg,
    borderWidth: 1,
    borderColor: colors.glassInputBorder,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 13,
    paddingVertical: 0,
  },
  shopCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 16,
  },
  bannerWrap: {
    height: 120,
    backgroundColor: '#18181b',
    position: 'relative',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1c1c20',
  },
  locationBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  locationBadgeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: '600',
  },
  logoWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: colors.card,
    marginLeft: 16,
    marginTop: -25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shopInfo: {
    padding: 16,
    paddingTop: 8,
  },
  shopName: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  shopDesc: {
    color: colors.foregroundMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  browseText: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyText: {
    color: colors.foregroundMuted,
    fontSize: 13,
  },
});
