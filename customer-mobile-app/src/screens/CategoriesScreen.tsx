import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Grid3X3, ArrowRight } from 'lucide-react-native';
import { Header } from '../components/Header';
import { productService, Category } from '../services/product.service';
import { Footer } from '../components/Footer';
import { FloatingSupportButton } from '../components/FloatingSupportButton';
import { useBranding } from '../context/BrandingContext';
import { RootStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cmr9ayow4001kf921lajtjl45', name: '3D Printing', slug: '3d-printing' },
  { id: 'cmr9ayovd001hf9210uwdgpyr', name: 'Art & Craft', slug: 'art-and-craft' },
  { id: 'cmr9ayot30014f921rwxue9t5', name: 'Books', slug: 'books' },
  { id: 'cmr9ayorw0011f921k53xva9b', name: 'Fashion', slug: 'fashion' },
  { id: 'cmr9ayouq001ef921gvz3lsmw', name: 'Garden', slug: 'garden' },
  { id: 'cmr9ayotx0019f921y0ylo5jr', name: 'Groceries', slug: 'groceries' },
  { id: 'cmr9ayos20012f921dc9or3c9', name: 'Home & Kitchen', slug: 'home-and-kitchen' },
  { id: 'cmr9ayouk001df9219j6f9oft', name: 'Office Supplies', slug: 'office-supplies' },
  { id: 'cmr9c54db0015ck1jmf5ar36s', name: 'Sports', slug: 'sports' },
  { id: 'cmr9ayowa001lf921babaagsm', name: 'Stationery', slug: 'stationery' },
];

export const CategoriesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { branding } = useBranding();
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    productService
      .getCategories()
      .then((cats) => {
        if (cats && cats.length > 0) setCategories(cats);
      })
      .catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Section matching CategoriesPage.tsx */}
        <View style={styles.titleSection}>
          <View style={styles.pillBadge}>
            <View style={styles.dot} />
            <Text style={styles.pillText}>BROWSE BY CATEGORY</Text>
          </View>
          <Text style={styles.heading}>
            Explore{' '}
            <Text style={styles.headingGradient}>Categories</Text>
          </Text>
          <Text style={styles.subheading}>
            Discover products across every category. All verified and listed on {branding.name || 'Atlas Basket'}.
          </Text>
        </View>

        {/* Categories Grid (aspect-square cards matching web) */}
        <View style={styles.grid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => navigation.navigate('Products', { categoryId: cat.id })}
              style={styles.card}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                {cat.imageUrl ? (
                  <Image source={{ uri: cat.imageUrl }} style={styles.iconImg} />
                ) : (
                  <Grid3X3 size={24} color="rgba(255, 255, 255, 0.5)" />
                )}
              </View>
              <Text style={styles.catName} numberOfLines={2}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Footer />
      </ScrollView>

      <FloatingSupportButton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 28,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  pillText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heading: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  headingGradient: {
    color: 'rgba(255, 255, 255, 0.55)',
  },
  subheading: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginTop: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 36,
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  catName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 17,
  },
});
