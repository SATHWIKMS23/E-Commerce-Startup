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
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  Filter,
  Compass,
  Sparkles,
  History,
  Star,
  Package,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { FloatingSupportButton } from '../components/FloatingSupportButton';
import { productService, Product, Category } from '../services/product.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export const ProductsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [mode, setMode] = useState<'all' | 'recommended' | 'recently-viewed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    productService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (route.params?.q) {
      setSearchQuery(route.params.q);
    }
    if (route.params?.categoryId) {
      setSelectedCategoryId(route.params.categoryId);
    }
  }, [route.params]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await productService.getProducts({
        page,
        limit: 10,
        mode,
        searchQuery: searchQuery.trim() || undefined,
        categoryId: selectedCategoryId || undefined,
      });
      setProducts(res.products);
      setTotalPages(res.totalPages);
    } catch {
      // Ignore network errors
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [mode, page, selectedCategoryId]);

  const handleSearchSubmit = () => {
    setPage(1);
    loadProducts();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId('');
    setPage(1);
  };

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Intro */}
        <View style={styles.introSection}>
          <Text style={styles.heading}>Explore Products</Text>
          <Text style={styles.subheading}>
            Browse through active shop products, customizable prints, and handcrafted local goods.
          </Text>

          {/* Mode Selector Tabs */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              onPress={() => { setMode('all'); setPage(1); }}
              style={[styles.modeTab, mode === 'all' && styles.modeTabActive]}
            >
              <Compass size={13} color={mode === 'all' ? colors.foreground : colors.foregroundMuted} />
              <Text style={[styles.modeTabText, mode === 'all' && styles.modeTabTextActive]}>
                Browse
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setMode('recommended'); setPage(1); }}
              style={[styles.modeTab, mode === 'recommended' && styles.modeTabActive]}
            >
              <Sparkles size={13} color={mode === 'recommended' ? colors.foreground : colors.foregroundMuted} />
              <Text style={[styles.modeTabText, mode === 'recommended' && styles.modeTabTextActive]}>
                Recommended
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setMode('recently-viewed'); setPage(1); }}
              style={[styles.modeTab, mode === 'recently-viewed' && styles.modeTabActive]}
            >
              <History size={13} color={mode === 'recently-viewed' ? colors.foreground : colors.foregroundMuted} />
              <Text style={[styles.modeTabText, mode === 'recently-viewed' && styles.modeTabTextActive]}>
                Recent
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color={colors.foregroundDim} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search keyword..."
            placeholderTextColor={colors.foregroundDim}
            style={styles.searchInput}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadProducts(); }}>
              <X size={16} color={colors.foregroundMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Filter Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catsRow}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategoryId('')}
            style={[styles.catPill, !selectedCategoryId && styles.catPillActive]}
          >
            <Text style={[styles.catPillText, !selectedCategoryId && styles.catPillTextActive]}>
              All Categories
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategoryId(isSelected ? '' : cat.id)}
                style={[styles.catPill, isSelected && styles.catPillActive]}
              >
                <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Product Cards Grid */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : products.length > 0 ? (
          <View style={styles.productsGrid}>
            {products.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                style={styles.productCard}
                activeOpacity={0.8}
              >
                {/* Product Thumbnail */}
                <View style={styles.thumbnailWrap}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.productImg} />
                  ) : (
                    <Package size={28} color={colors.foregroundDim} />
                  )}
                  {item.shop && (
                    <View style={styles.shopBadge}>
                      <Text style={styles.shopBadgeText} numberOfLines={1}>
                        {item.shop.name}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Details */}
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {item.name}
                  </Text>

                  {/* Rating */}
                  <View style={styles.ratingRow}>
                    <Star size={11} color="#eab308" fill="#eab308" />
                    <Text style={styles.ratingText}>
                      {(item.averageRating || 5).toFixed(1)}
                    </Text>
                  </View>

                  {/* Price */}
                  <Text style={styles.priceText}>
                    {productService.formatPrice(item.price)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Package size={44} color={colors.foregroundDim} />
            <Text style={styles.emptyText}>No products found.</Text>
            {(searchQuery || selectedCategoryId) && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              disabled={page <= 1}
              onPress={() => setPage(page - 1)}
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            >
              <ChevronLeft size={16} color={colors.foreground} />
              <Text style={styles.pageBtnText}>Prev</Text>
            </TouchableOpacity>

            <Text style={styles.pageInfo}>
              Page {page} of {totalPages}
            </Text>

            <TouchableOpacity
              disabled={page >= totalPages}
              onPress={() => setPage(page + 1)}
              style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
            >
              <Text style={styles.pageBtnText}>Next</Text>
              <ChevronRight size={16} color={colors.foreground} />
            </TouchableOpacity>
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
  modeTabs: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modeTabText: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: colors.foreground,
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
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 13,
    paddingVertical: 0,
  },
  catsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  catPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catPillText: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  catPillTextActive: {
    color: colors.primaryForeground,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 6,
  },
  thumbnailWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shopBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '85%',
  },
  shopBadgeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 9,
    fontWeight: '700',
  },
  productInfo: {
    padding: 10,
    gap: 4,
  },
  productTitle: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
    minHeight: 32,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: colors.foregroundMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  priceText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: colors.foregroundMuted,
    fontSize: 13,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 6,
  },
  clearBtnText: {
    color: colors.foreground,
    fontSize: 11,
    fontWeight: '700',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pageBtnDisabled: {
    opacity: 0.35,
  },
  pageBtnText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  pageInfo: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
