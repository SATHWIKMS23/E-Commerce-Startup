import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAnalytics } from '@/features/analytics/hooks/useAnalytics';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { ordersService } from '@/features/orders/services/ordersService';
import { productService } from '@/features/products/services/productService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShop } from '@/features/shop/hooks/useShop';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { SellerAgreementBanner } from '@/features/shop/ui/SellerAgreementBanner';
import {
  IndianRupee,
  ShoppingBag,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Store,
  TrendingUp,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface DashboardPageProps {
  navigation: any;
}

export function DashboardPage({ navigation }: DashboardPageProps) {
  const { user } = useAuth();
  const { hasShop, shop, refetchShop } = useShop();
  const { metrics, chartData, isLoadingMetrics } = useAnalytics();
  const { orders, isLoading: isLoadingOrders, refetch: refetchOrders } = useOrders();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchShop(), refetchOrders()]);
    setRefreshing(false);
  };

  const recentOrders = orders.slice(0, 5);

  const stats = [
    {
      id: 'gross-sales',
      name: 'Gross Sales',
      value: productService.formatPrice(metrics?.totalSales ?? 0),
      desc: 'Cumulative sales (gross)',
      icon: IndianRupee,
      color: Colors.emerald,
    },
    {
      id: 'net-earnings',
      name: 'Net Earnings',
      value: productService.formatPrice(metrics?.netEarnings ?? 0),
      desc: 'Your share after commission',
      icon: IndianRupee,
      color: Colors.purpleLight,
    },
    {
      id: 'todays-orders',
      name: "Today's Orders",
      value: `${metrics?.todaysOrders ?? 0}`,
      desc: 'Orders placed today',
      icon: ShoppingBag,
      color: Colors.indigo,
    },
    {
      id: 'pending-orders',
      name: 'Pending Orders',
      value: `${metrics?.pendingOrders ?? 0}`,
      desc: 'Orders awaiting processing',
      icon: Clock,
      color: Colors.yellow,
    },
    {
      id: 'delivered-revenue',
      name: 'Delivered Revenue',
      value: productService.formatPrice(metrics?.revenue ?? 0),
      desc: 'Delivered order subtotal',
      icon: IndianRupee,
      color: Colors.cyan,
    },
    {
      id: 'completed-orders',
      name: 'Completed Orders',
      value: `${metrics?.completedOrders ?? 0}`,
      desc: 'Delivered orders count',
      icon: ShoppingBag,
      color: Colors.emerald,
    },
  ];

  return (
    <DashboardLayout title="Overview" navigation={navigation} currentRoute="/dashboard">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.purpleLight}
            colors={[Colors.purpleLight]}
          />
        }
      >
        {/* Welcome Header */}
        <View style={styles.welcomeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>
              Welcome back, {user?.firstName || 'Seller'}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Here is what is happening with your store today.
            </Text>
          </View>
        </View>

        {!hasShop ? (
          <Card style={styles.setupCard}>
            <View style={styles.setupIconBox}>
              <Store size={26} color={Colors.purpleLight} />
            </View>
            <Text style={styles.setupTitle}>Create Your Store Profile</Text>
            <Text style={styles.setupDesc}>
              Ready to start selling? Create your storefront, configure your pick-up address, and link your settlement bank details to list items.
            </Text>
            <View style={styles.setupActions}>
              <Button
                variant="outline"
                onPress={() => navigation.navigate('SellerProfile')}
                style={{ flex: 1, marginRight: 8 }}
              >
                Go to Profile
              </Button>
              <Button
                variant="default"
                onPress={() => navigation.navigate('ShopSetup')}
                style={{ flex: 1 }}
              >
                Create Shop Now
              </Button>
            </View>
          </Card>
        ) : shop && shop.status !== 'APPROVED' ? (
          <View style={{ marginBottom: 16 }}>
            <SellerAgreementBanner shopStatus={shop.status} />
          </View>
        ) : null}

        {/* Stats Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview Metrics</Text>
        </View>

        {isLoadingMetrics ? (
          <View style={styles.statsGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={88} style={styles.statCardSkeleton} />
            ))}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {stats.map((st) => {
              const Icon = st.icon;
              return (
                <View key={st.id} style={styles.statCard}>
                  <View style={styles.statTop}>
                    <Text style={styles.statName}>{st.name}</Text>
                    <Icon size={16} color={st.color} />
                  </View>
                  <Text style={styles.statValue}>{st.value}</Text>
                  <Text style={styles.statDesc}>{st.desc}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Actions */}
        <Card style={{ marginTop: 8 }}>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Task shortcuts for store management</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 8 }}>
            <Button
              variant="outline"
              onPress={() => navigation.navigate('Products')}
              icon={<Plus size={16} color={Colors.purpleLight} />}
              style={styles.actionBtn}
            >
              Add catalog item
            </Button>
            <Button
              variant="outline"
              onPress={() => navigation.navigate('CustomOrders')}
              icon={<Plus size={16} color={Colors.purpleLight} />}
              style={styles.actionBtn}
            >
              Quote custom requests
            </Button>
            <Button
              variant="outline"
              onPress={() => navigation.navigate('ShopSettings')}
              icon={<Plus size={16} color={Colors.purpleLight} />}
              style={styles.actionBtn}
            >
              Link settlement bank
            </Button>
          </CardContent>
        </Card>

        {/* Recent Incoming Orders */}
        <Card style={{ marginTop: 8 }}>
          <CardHeader>
            <View style={styles.ordersHeaderRow}>
              <View>
                <CardTitle>Recent Incoming Orders</CardTitle>
                <CardDescription>Most recent customer orders placed on your shop</CardDescription>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Orders')}
                style={styles.viewAllBtn}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <ArrowUpRight size={14} color={Colors.purpleLight} />
              </TouchableOpacity>
            </View>
          </CardHeader>
          <CardContent style={{ padding: 12 }}>
            {isLoadingOrders ? (
              <View style={{ gap: 8 }}>
                <Skeleton height={50} />
                <Skeleton height={50} />
              </View>
            ) : recentOrders.length > 0 ? (
              recentOrders.map((ord) => (
                <TouchableOpacity
                  key={ord.id}
                  onPress={() => navigation.navigate('OrderDetail', { orderId: ord.id })}
                  style={styles.orderItem}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.orderIdRow}>
                      <Text style={styles.orderNumber}>{ord.order.orderNumber}</Text>
                      <Badge variant={ordersService.getStatusColor(ord.status)} style={{ paddingVertical: 1 }}>
                        {ord.status}
                      </Badge>
                    </View>
                    <Text style={styles.orderDate}>
                      {ordersService.formatDate(ord.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.orderPrice}>
                    {productService.formatPrice(ord.totalPrice)}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyOrders}>
                <ShoppingBag size={28} color="rgba(255, 255, 255, 0.2)" />
                <Text style={styles.emptyOrdersText}>No orders received yet.</Text>
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeRow: {
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  welcomeSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  setupCard: {
    padding: 18,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    marginBottom: 16,
  },
  setupIconBox: {
    height: 42,
    width: 42,
    borderRadius: 12,
    backgroundColor: Colors.purpleBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  setupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  setupDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
    marginBottom: 14,
  },
  setupActions: {
    flexDirection: 'row',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  statCardSkeleton: {
    width: '48%',
    borderRadius: 14,
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statName: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  statDesc: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  actionBtn: {
    justifyContent: 'flex-start',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ordersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.purpleLight,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  orderDate: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  orderPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyOrdersText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 6,
  },
});
