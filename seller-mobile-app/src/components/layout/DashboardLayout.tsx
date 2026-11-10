import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShop } from '@/features/shop/hooks/useShop';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { useSellerLayout } from '@/lib/hooks/useSellerLayout';
import { useSidebarBadges } from '@/features/notifications/hooks/useNotifications';
import { Badge } from '@/shared/components/Badge';
import {
  Store,
  LayoutDashboard,
  Box,
  ShoppingBag,
  Wrench,
  BarChart3,
  CreditCard,
  Star,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  AlertTriangle,
  UserCircle,
  Gavel,
  FileText,
  FileSpreadsheet,
  MessageSquare,
  Bell,
  X,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

const getIconForItem = (path?: string) => {
  switch (path) {
    case '/dashboard':
      return LayoutDashboard;
    case '/products':
      return Box;
    case '/orders':
      return ShoppingBag;
    case '/custom-orders':
      return Wrench;
    case '/analytics':
      return BarChart3;
    case '/payouts':
      return CreditCard;
    case '/reviews':
      return Star;
    case '/enforcement':
      return Gavel;
    case '/policies':
      return FileText;
    case '/commission-statements':
      return FileSpreadsheet;
    case '/support-chat':
      return MessageSquare;
    case '/profile':
      return UserCircle;
    case '/shop':
      return Store;
    case '/settings':
      return Settings;
    default:
      return LayoutDashboard;
  }
};

const getBadgeForItem = (path: string | undefined, badges: any): number => {
  switch (path) {
    case '/orders':
      return badges.orders;
    case '/custom-orders':
      return badges.customRequests;
    case '/payouts':
      return badges.payouts;
    case '/reviews':
      return badges.reviews;
    case '/enforcement':
      return badges.compliance;
    case '/policies':
      return badges.policies;
    case '/commission-statements':
      return badges.commissionStatements;
    case '/support-chat':
      return badges.support;
    case '/shop':
      return badges.shop;
    case '/notifications':
      return badges.notifications;
    default:
      return 0;
  }
};

const pathToScreenMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/orders': 'Orders',
  '/custom-orders': 'CustomOrders',
  '/analytics': 'Analytics',
  '/payouts': 'Payouts',
  '/reviews': 'Reviews',
  '/enforcement': 'Enforcement',
  '/policies': 'Policies',
  '/commission-statements': 'CommissionStatements',
  '/support-chat': 'SupportChat',
  '/profile': 'SellerProfile',
  '/shop': 'ShopSettings',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  navigation: any;
  currentRoute?: string;
}

export function DashboardLayout({
  children,
  title = 'Overview',
  navigation,
  currentRoute = '/dashboard',
}: DashboardLayoutProps) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { shop } = useShop();
  const showConfirm = useConfirmStore((s) => s.showConfirm);
  const { sidebar, branding } = useSellerLayout();
  const { badges } = useSidebarBadges();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const sellerPortalName = (branding?.sellerPortalTitle || branding?.name || 'Seller Portal').trim();
  const sellerPortalTagline = branding?.sellerPortalTagline || branding?.tagline || 'Manage your storefront, products, and incoming orders.';

  const handleLogout = () => {
    setDrawerOpen(false);
    showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your seller portal?',
      confirmText: 'Sign Out',
      onConfirm: async () => {
        await logout();
      },
    });
  };

  const handleNavigate = (path?: string) => {
    setDrawerOpen(false);
    if (!path) return;
    const targetScreen = pathToScreenMap[path] || 'Dashboard';
    navigation.navigate(targetScreen);
  };

  const shopStatusVariant = () => {
    if (!shop) return 'destructive';
    switch (shop.status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'default';
      case 'REJECTED':
      case 'SUSPENDED':
      case 'DISABLED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => setDrawerOpen(true)}
            style={styles.menuBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu size={20} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.breadcrumbs}>
            <Text style={styles.portalName} numberOfLines={1}>
              {sellerPortalName}
            </Text>
            <ChevronRight size={12} color="rgba(255, 255, 255, 0.25)" />
            <Text style={styles.pageTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {shop && shop.status !== 'APPROVED' ? (
            <View style={styles.warningPill}>
              <AlertTriangle size={12} color={Colors.yellow} />
              <Text style={styles.warningText}>{shop.status}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.notifBtn}
          >
            <Bell size={18} color="rgba(255, 255, 255, 0.8)" />
            {badges.notifications > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeDotText}>
                  {badges.notifications > 99 ? '99+' : badges.notifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Screen Body */}
      <View style={styles.mainContent}>{children}</View>

      {/* Slide-out Drawer Modal */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setDrawerOpen(false)}
            style={styles.drawerBackdrop}
          />

          <View style={[styles.drawerContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
            {/* Drawer Brand */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrandRow}>
                <View style={styles.drawerLogoBox}>
                  {branding.logo ? (
                    <Image
                      source={{ uri: branding.logo }}
                      style={{ width: 22, height: 22 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Store size={18} color={Colors.purpleLight} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerPortalName} numberOfLines={1}>
                    {sellerPortalName}
                  </Text>
                  <Text style={styles.drawerPortalTagline} numberOfLines={1}>
                    {sellerPortalTagline}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDrawerOpen(false)} style={styles.drawerCloseBtn}>
                  <X size={16} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Shop selector card */}
            {shop ? (
              <View style={styles.shopCard}>
                <View style={styles.shopCardLogo}>
                  {shop.logoUrl ? (
                    <Image source={{ uri: shop.logoUrl }} style={{ width: 34, height: 34, borderRadius: 8 }} />
                  ) : (
                    <Store size={18} color="rgba(255, 255, 255, 0.4)" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopCardName} numberOfLines={1}>
                    {shop.name}
                  </Text>
                  <View style={{ marginTop: 2 }}>
                    <Badge variant={shopStatusVariant()} style={{ alignSelf: 'flex-start', paddingVertical: 1 }}>
                      {shop.status}
                    </Badge>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Navigation links */}
            <ScrollView style={styles.drawerNav} showsVerticalScrollIndicator={false}>
              {sidebar.map((item) => {
                const Icon = getIconForItem(item.path);
                const itemPath = item.path || '/dashboard';
                const isActive = currentRoute === itemPath;
                const badgeCount = getBadgeForItem(itemPath, badges);

                return (
                  <TouchableOpacity
                    key={item.id || itemPath}
                    onPress={() => handleNavigate(itemPath)}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                  >
                    <Icon
                      size={17}
                      color={isActive ? Colors.purpleLight : 'rgba(255, 255, 255, 0.6)'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.navItemText, isActive && styles.navItemTextActive]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {badgeCount > 0 ? (
                      <View style={styles.navBadge}>
                        <Text style={styles.navBadgeText}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* User Info & Sign Out Footer */}
            <View style={styles.drawerFooter}>
              <View style={styles.userRow}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user?.firstName?.[0]?.toUpperCase() || 'S'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user?.email}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={handleLogout} style={styles.signOutBtn}>
                <LogOut size={14} color="rgba(255, 255, 255, 0.7)" style={{ marginRight: 8 }} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(7, 7, 10, 0.95)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginRight: 12,
  },
  breadcrumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  portalName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  pageTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.yellow,
  },
  notifBtn: {
    padding: 8,
    borderRadius: 8,
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.purple,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  mainContent: {
    flex: 1,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  drawerContent: {
    width: '82%',
    maxWidth: 320,
    backgroundColor: '#07070a',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  drawerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerLogoBox: {
    height: 36,
    width: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerPortalName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  drawerPortalTagline: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 1,
  },
  drawerCloseBtn: {
    padding: 6,
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  shopCardLogo: {
    height: 36,
    width: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  drawerNav: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 3,
  },
  navItemActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  navItemText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  navItemTextActive: {
    color: Colors.purpleLight,
    fontWeight: '700',
  },
  navBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  navBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.purpleLight,
  },
  drawerFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  userAvatar: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
