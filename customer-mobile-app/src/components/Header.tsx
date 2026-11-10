import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  ShoppingCart,
  Bell,
  Menu,
  X,
  MapPin,
  ChevronDown,
  User,
  LayoutDashboard,
  LogOut,
  Sparkles,
} from 'lucide-react-native';
import { BrandLogo } from './BrandLogo';
import { ShopMarquee } from './ShopMarquee';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

interface HeaderProps {
  showMarquee?: boolean;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ showMarquee = true, onOpenSearch }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount, setCartOpen } = useCart();
  const { selectedDistrict, selectedState, setAddressSelectorOpen } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const locationLabel = [selectedDistrict, selectedState].filter(Boolean).join(', ') || 'Location';
  const displayName = user
    ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email)
    : 'Customer';

  const navigateTo = (screen: any, params?: any) => {
    setMobileMenuOpen(false);
    navigation.navigate(screen, params);
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 8) }]}>
      {/* Main Navbar Row */}
      <View style={styles.navRow}>
        {/* Left: Brand Logo + Text */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
          style={styles.brandButton}
        >
          <BrandLogo fontSize={16} size={30} />
        </TouchableOpacity>

        {/* Right Actions */}
        <View style={styles.actionsRow}>
          {/* Search */}
          <TouchableOpacity
            onPress={onOpenSearch}
            style={styles.iconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={19} color="rgba(255, 255, 255, 0.7)" />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            onPress={() => navigation.navigate(isAuthenticated ? 'Notifications' : 'Login')}
            style={styles.iconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bell size={19} color="rgba(255, 255, 255, 0.7)" />
          </TouchableOpacity>

          {/* Shopping Cart */}
          <TouchableOpacity
            onPress={() => setCartOpen(true)}
            style={styles.iconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ShoppingCart size={19} color="rgba(255, 255, 255, 0.7)" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Hamburger Menu Toggle (☰ / ✕) */}
          <TouchableOpacity
            onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={styles.menuBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {mobileMenuOpen ? (
              <X size={20} color="#ffffff" />
            ) : (
              <Menu size={20} color="rgba(255, 255, 255, 0.8)" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Optional Shop Marquee beneath Navbar */}
      {showMarquee && <ShopMarquee />}

      {/* Mobile Navigation Drawer Dropdown */}
      {mobileMenuOpen && (
        <View style={styles.drawerContainer}>
          <ScrollView
            style={styles.drawerScroll}
            contentContainerStyle={styles.drawerContent}
            bounces={false}
          >
            {/* Location Chip */}
            <View style={styles.drawerSection}>
              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  setAddressSelectorOpen(true);
                }}
                style={styles.locationChip}
                activeOpacity={0.7}
              >
                <MapPin size={12} color="#ffffff" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationLabel}
                </Text>
                <ChevronDown size={10} color="rgba(255, 255, 255, 0.4)" />
              </TouchableOpacity>
            </View>

            {/* Auth / Profile Section */}
            {isAuthenticated ? (
              <View style={styles.userCard}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user?.email || ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigateTo('Profile')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.profileLink}>Profile</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.authRow}>
                <TouchableOpacity
                  onPress={() => navigateTo('Login')}
                  style={styles.signInBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigateTo('Signup')}
                  style={styles.signUpBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signUpText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Primary Nav Links */}
            <View style={styles.navLinksSection}>
              <TouchableOpacity
                onPress={() => navigateTo('Home')}
                style={styles.navLinkItem}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigateTo('Categories')}
                style={styles.navLinkItem}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>Categories</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigateTo('Products')}
                style={styles.navLinkItem}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>Products</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigateTo('Shops')}
                style={styles.navLinkItem}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>Shops</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigateTo('CustomOrders')}
                style={styles.navLinkItem}
                activeOpacity={0.7}
              >
                <Text style={styles.navLinkText}>Custom Orders</Text>
              </TouchableOpacity>
            </View>

            {/* Account Links (if authenticated) */}
            {isAuthenticated && (
              <View style={styles.accountSection}>
                <TouchableOpacity
                  onPress={() => navigateTo('Profile')}
                  style={styles.accountLinkItem}
                  activeOpacity={0.7}
                >
                  <User size={15} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.accountLinkText}>My Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateTo('OrderHistory')}
                  style={styles.accountLinkItem}
                  activeOpacity={0.7}
                >
                  <LayoutDashboard size={15} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.accountLinkText}>My Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateTo('Wishlist')}
                  style={styles.accountLinkItem}
                  activeOpacity={0.7}
                >
                  <ShoppingCart size={15} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.accountLinkText}>My Wishlist</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateTo('Notifications')}
                  style={styles.accountLinkItem}
                  activeOpacity={0.7}
                >
                  <Bell size={15} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.accountLinkText}>Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                  }}
                  style={styles.signOutBtn}
                  activeOpacity={0.7}
                >
                  <LogOut size={15} color="#f87171" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 50,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  menuBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginLeft: 2,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  drawerContainer: {
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: 480,
  },
  drawerScroll: {
    flexGrow: 0,
  },
  drawerContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  drawerSection: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 160,
  },
  authRow: {
    flexDirection: 'row',
    gap: 10,
  },
  signInBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  signInText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  signUpBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  signUpText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    marginTop: 2,
  },
  profileLink: {
    color: '#a855f7',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
  },
  navLinksSection: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  navLinkItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  navLinkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  accountSection: {
    paddingTop: 4,
    gap: 4,
  },
  accountLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  accountLinkText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    fontWeight: '500',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 4,
    borderRadius: 8,
  },
  signOutText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
});
