import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useAnalytics } from '../hooks/useAnalytics';
import { useProducts } from '@/features/products/hooks/useProducts';
import { productService } from '@/features/products/services/productService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { TrendingUp, Package, AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface AnalyticsPageProps {
  navigation: any;
}

export function AnalyticsPage({ navigation }: AnalyticsPageProps) {
  const { chartData, topSelling, isLoadingTop, isLoadingRevenue } = useAnalytics();
  const { lowStockProducts, isLoadingLowStock } = useProducts();

  return (
    <DashboardLayout title="Analytics" navigation={navigation} currentRoute="/analytics">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Deep Store Analytics</Text>
          <Text style={styles.subtitle}>Review sales trends, top product performance, and catalog alerts.</Text>
        </View>

        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Most popular items sold by quantity</CardDescription>
          </CardHeader>
          <CardContent style={{ padding: 12 }}>
            {isLoadingTop ? (
              <Skeleton height={80} />
            ) : topSelling.length > 0 ? (
              topSelling.map((item, idx) => (
                <View key={idx} style={styles.topItem}>
                  <View style={styles.topItemImgBox}>
                    {item.product?.imageUrl ? (
                      <Image source={{ uri: item.product.imageUrl }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Package size={20} color="rgba(255, 255, 255, 0.3)" />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.topItemName} numberOfLines={1}>
                      {item.product?.name || 'Unknown Product'}
                    </Text>
                    <Text style={styles.topItemSub}>
                      {item.quantitySold} units sold
                    </Text>
                  </View>
                  <Text style={styles.topItemPrice}>
                    {productService.formatPrice(item.product?.price * item.quantitySold)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No products sold yet.</Text>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} color={Colors.yellow} />
              <CardTitle>Low Stock Alerts</CardTitle>
            </View>
            <CardDescription>Verify quantities to keep catalog active</CardDescription>
          </CardHeader>
          <CardContent style={{ padding: 12 }}>
            {isLoadingLowStock ? (
              <Skeleton height={80} />
            ) : lowStockProducts.length > 0 ? (
              lowStockProducts.map((prod) => (
                <View key={prod.id} style={styles.topItem}>
                  <View style={styles.topItemImgBox}>
                    {prod.imageUrl ? (
                      <Image source={{ uri: prod.imageUrl }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Package size={20} color="rgba(255, 255, 255, 0.3)" />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.topItemName} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={styles.topItemSub}>
                      {productService.formatPrice(prod.price)}
                    </Text>
                  </View>
                  <Badge variant={prod.stockQuantity === 0 ? 'destructive' : 'warning'}>
                    {prod.stockQuantity === 0 ? 'Out of stock' : `${prod.stockQuantity} left`}
                  </Badge>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No low stock warnings. Catalog is healthy!</Text>
            )}
          </CardContent>
        </Card>

        {/* Revenue Logs Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Logs Summary</CardTitle>
            <CardDescription>Settled store performance dates</CardDescription>
          </CardHeader>
          <CardContent style={{ padding: 12 }}>
            {isLoadingRevenue ? (
              <Skeleton height={80} />
            ) : chartData.length > 0 ? (
              chartData.slice(0, 10).map((pt, i) => (
                <View key={i} style={styles.revenueRow}>
                  <Text style={styles.revenueDate}>{pt.date}</Text>
                  <Text style={styles.revenueAmount}>{productService.formatPrice(pt.revenue)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No revenue logs recorded this month.</Text>
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  topItemImgBox: {
    height: 44,
    width: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  topItemSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  topItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.purpleLight,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  revenueDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  revenueAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.emerald,
  },
  emptyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    paddingVertical: 14,
  },
});
