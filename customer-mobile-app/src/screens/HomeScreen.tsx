import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  MapPin,
  Store,
  ChevronRight,
  Grid3X3,
  Users,
  Printer,
  Clock,
  ShieldCheck,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { GridBackground } from '../components/GridBackground';
import { Footer } from '../components/Footer';
import { SearchModal } from '../components/SearchModal';
import { AddressSelectorModal } from '../components/AddressSelectorModal';
import { ComingSoonModal } from '../components/ComingSoonModal';
import { CartModal } from '../components/CartModal';
import { FloatingSupportButton } from '../components/FloatingSupportButton';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';
import { productService, Category } from '../services/product.service';
import { shopService, Shop } from '../services/shop.service';
import { RootStackParamList } from '../navigation/types';

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

const valueProps = [
  { icon: Users, title: 'Support Local Crafters', desc: 'Every purchase goes directly to independent local makers in your area.' },
  { icon: Printer, title: 'Regional Custom Prints', desc: 'Commission and print locally to reduce carbon footprint.' },
  { icon: Clock, title: 'Fast Turnaround', desc: 'Same-day pickup or lightning-fast regional delivery.' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: 'End-to-end encrypted transactions powered by Stripe / Razorpay.' },
];

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { branding } = useBranding();
  const { isAuthenticated } = useAuth();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [shops, setShops] = useState<Shop[]>(DEFAULT_SHOPS);
  const [searchOpen, setSearchOpen] = useState(false);

  // Exact full screen height calculation for the Hero viewport
  // Initially estimate from screen height, then lock to ScrollView's onLayout height
  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    const screenH = Dimensions.get('screen').height;
    return Math.max(680, screenH - Math.max(insets.top, 8) - 52 - 38);
  });

  useEffect(() => {
    Promise.all([
      productService.getCategories(),
      shopService.getFeaturedShops(6),
    ])
      .then(([cats, shopsData]) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
        if (shopsData && shopsData.shops && shopsData.shops.length > 0) {
          setShops(shopsData.shops);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      {/* Top Header matching customer-app Navbar */}
      <Header onOpenSearch={() => setSearchOpen(true)} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        onLayout={(e) => {
          const layoutH = e.nativeEvent.layout.height;
          if (layoutH > 300 && Math.abs(layoutH - viewportHeight) > 2) {
            setViewportHeight(layoutH);
          }
        }}
      >
        {/* ─── Hero Section (100dvh Exact Full Screen Height) ────────────── */}
        <View style={[styles.heroSection, { height: viewportHeight, minHeight: viewportHeight }]}>
          <GridBackground />

          <View style={styles.heroContentInner}>
            {/* Eyebrow Badge */}
            <View style={styles.eyebrowBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.eyebrowText}>
                {branding.heroBadge || 'BY LOCAL PEOPLE — FOR THE LOCAL PEOPLE'}
              </Text>
            </View>

            {/* Headline */}
            <View style={styles.headlineBox}>
              <Text style={styles.heroHeadingLine1}>
                {branding.heroHeadingLine1 || 'Buy Anything.'}
              </Text>
              <Text style={styles.heroHeadingLine2}>
                {branding.heroHeadingLine2 || 'From Anyone.'}
              </Text>
              <Text style={styles.heroHeadingLine3}>
                {branding.heroHeadingLine3 || 'Near You.'}
              </Text>
            </View>

            {/* Subheading */}
            <Text style={styles.heroDesc}>
              {branding.heroDescription ||
                'Atlas Basket is your local marketplace for everything — fashion, prints, crafts, and beyond. Discover creators. Support neighbours.'}
            </Text>

            {/* Action CTAs */}
            <View style={styles.heroCtas}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Shops')}
                style={styles.primaryBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {branding.exploreShopsButtonText || 'Explore Shops'}
                </Text>
                <ArrowRight size={15} color="#000000" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Products')}
                style={styles.outlineBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.outlineBtnText}>
                  {branding.browseProductsButtonText || 'Browse Products'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── Categories Section (Starts on NEXT Full Screen) ─────────── */}
        <View style={[styles.categoriesSection, { minHeight: viewportHeight }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionSub}>BROWSE BY</Text>
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Categories')}
              style={styles.viewAllRow}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewAllText}>View all</Text>
              <ArrowRight size={13} color="rgba(255, 255, 255, 0.45)" />
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.slice(0, 10).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => navigation.navigate('Products', { categoryId: cat.id })}
                style={[styles.categoryCard, { width: (windowWidth - 44) / 2 }]}
                activeOpacity={0.7}
              >
                <View style={styles.categoryIconBox}>
                  {cat.imageUrl ? (
                    <Image source={{ uri: cat.imageUrl }} style={styles.categoryImg} />
                  ) : (
                    <Grid3X3 size={22} color="rgba(255, 255, 255, 0.75)" />
                  )}
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Featured Creators Section (Next Screen) ────────────────────── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionSub}>HANDPICKED</Text>
              <Text style={styles.sectionTitle}>Featured Creators</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Shops')}
              style={styles.viewAllRow}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewAllText}>All Shops</Text>
              <ArrowRight size={13} color="rgba(255, 255, 255, 0.45)" />
            </TouchableOpacity>
          </View>

          {shops.map((shop) => (
            <TouchableOpacity
              key={shop.id}
              onPress={() => navigation.navigate('ShopDetail', { shopId: shop.slug || shop.id })}
              style={styles.shopCard}
              activeOpacity={0.8}
            >
              {/* Banner with Blue/Purple Gradient matching web */}
              <View style={styles.shopBanner}>
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
                    <MapPin size={11} color="#ffffff" />
                    <Text style={styles.locationBadgeText}>
                      {shop.defaultPickupAddress.city}, {shop.defaultPickupAddress.state}
                    </Text>
                  </View>
                )}
              </View>

              {/* Avatar Bridge */}
              <View style={styles.shopAvatar}>
                {shop.logoUrl ? (
                  <Image source={{ uri: shop.logoUrl }} style={styles.avatarImg} />
                ) : (
                  <Store size={22} color="rgba(255, 255, 255, 0.5)" />
                )}
              </View>

              {/* Info */}
              <View style={styles.shopContent}>
                <Text style={styles.shopCardTitle}>{shop.name}</Text>
                <Text style={styles.shopCardDesc} numberOfLines={2}>
                  {shop.description || 'Premium local craft maker.'}
                </Text>

                <View style={styles.shopCardFooter}>
                  <Text style={styles.browseShopText}>Browse shop</Text>
                  <ChevronRight size={13} color="rgba(255, 255, 255, 0.45)" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Custom Prints CTA ─────────────────────────────────────────── */}
        <View style={styles.ctaBox}>
          <Text style={styles.ctaEyebrow}>MADE JUST FOR YOU</Text>
          <Text style={styles.ctaTitle}>Need Something{'\n'}One-of-a-Kind?</Text>
          <Text style={styles.ctaDesc}>
            Commission anything custom — from 3D-printed parts to tailored clothing, bespoke artwork, or personalised gifts. Local makers, real results.
          </Text>

          {/* Badges row */}
          <View style={styles.featuresRow}>
            {['Verify designs', 'Local creators', 'Track production'].map((item) => (
              <View key={item} style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('CustomOrders')}
            style={styles.ctaBtn}
            activeOpacity={0.8}
          >
            <Printer size={15} color="#000000" />
            <Text style={styles.ctaBtnText}>Start a Custom Order</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Value Propositions ────────────────────────────────────────── */}
        <View style={styles.valueSection}>
          {valueProps.map((vp, index) => {
            const Icon = vp.icon;
            return (
              <View key={index} style={styles.valueCard}>
                <View style={styles.valueIconBox}>
                  <Icon size={18} color="#ffffff" />
                </View>
                <Text style={styles.valueTitle}>{vp.title}</Text>
                <Text style={styles.valueDesc}>{vp.desc}</Text>
              </View>
            );
          })}
        </View>

        {/* ─── Guest Account CTA (from customer-app HomePage) ─────────────── */}
        {!isAuthenticated && (
          <View style={styles.guestSection}>
            <Text style={styles.guestTitle}>
              Your neighbourhood.{'\n'}Your marketplace.
            </Text>
            <Text style={styles.guestDesc}>
              Join {branding.name || 'Atlas Basket'} free — browse local sellers, follow your favourite shops, and get anything delivered or picked up nearby.
            </Text>
            <View style={styles.guestBtnRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Signup')}
                style={styles.guestPrimaryBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.guestPrimaryBtnText}>Create Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.guestOutlineBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.guestOutlineBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Full Footer matching web */}
        <Footer />
      </ScrollView>

      {/* Floating Support Desk & Report Widget */}
      <FloatingSupportButton />

      {/* Global Modals */}
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      <AddressSelectorModal />
      <ComingSoonModal />
      <CartModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroSection: {
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroContentInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 10,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  eyebrowText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headlineBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroHeadingLine1: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 44,
    textAlign: 'center',
    letterSpacing: -1.2,
  },
  heroHeadingLine2: {
    color: 'rgba(255, 255, 255, 0.42)',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 44,
    textAlign: 'center',
    letterSpacing: -1.2,
  },
  heroHeadingLine3: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 44,
    textAlign: 'center',
    letterSpacing: -1.2,
  },
  heroDesc: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 310,
    marginBottom: 28,
  },
  heroCtas: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    height: 44,
    width: 220,
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  outlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    height: 44,
    width: 220,
  },
  outlineBtnText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '700',
  },
  categoriesSection: {
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 48,
    justifyContent: 'flex-start',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  sectionSub: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  viewAllText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '700',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  categoryIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  shopCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  shopBanner: {
    height: 160,
    backgroundColor: '#18181b',
    position: 'relative',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  locationBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  locationBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  shopAvatar: {
    position: 'absolute',
    top: 130,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#0a0a0a',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shopContent: {
    paddingTop: 36,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  shopCardTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  shopCardDesc: {
    color: 'rgba(255, 255, 255, 0.42)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  shopCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  browseShopText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '700',
  },
  ctaBox: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  ctaEyebrow: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  ctaTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  ctaDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 48,
  },
  ctaBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  valueSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
  },
  valueCard: {
    gap: 8,
  },
  valueIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  valueTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  valueDesc: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    lineHeight: 19,
  },
  guestSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 16,
  },
  guestTitle: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.8,
  },
  guestDesc: {
    color: 'rgba(0, 0, 0, 0.55)',
    fontSize: 14,
    lineHeight: 22,
  },
  guestBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  guestPrimaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  guestOutlineBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.25)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestOutlineBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});
