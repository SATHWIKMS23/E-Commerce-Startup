import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useOrders } from '../hooks/useOrders';
import { ordersService } from '../services/ordersService';
import { productService } from '@/features/products/services/productService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { Search, ShoppingBag, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface OrdersPageProps {
  navigation: any;
}

export function OrdersPage({ navigation }: OrdersPageProps) {
  const { orders, isLoading, refetch } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const statuses = ['ALL', 'PENDING', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.order.customerEmail && o.order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.order.shippingAddress?.fullName &&
        o.order.shippingAddress.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' ? true : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout title="Orders" navigation={navigation} currentRoute="/orders">
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.topBar}>
          <Input
            placeholder="Search by order number or email…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={{ marginBottom: 0 }}
            icon={<Search size={16} color={Colors.textMuted} />}
          />
        </View>

        {/* Status Filter Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusTabs}
        >
          {statuses.map((st) => (
            <TouchableOpacity
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[styles.statusTab, statusFilter === st && styles.statusTabActive]}
            >
              <Text style={[styles.statusTabText, statusFilter === st && styles.statusTabTextActive]}>
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Orders List */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                refetch();
              }}
              tintColor={Colors.purpleLight}
            />
          }
        >
          {isLoading ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={90} borderRadius={14} />
              <Skeleton height={90} borderRadius={14} />
              <Skeleton height={90} borderRadius={14} />
            </View>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((ord) => (
              <TouchableOpacity
                key={ord.id}
                onPress={() => navigation.navigate('OrderDetail', { orderId: ord.id })}
                activeOpacity={0.75}
              >
                <Card style={styles.orderCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.orderNumber}>{ord.order.orderNumber}</Text>
                      <Badge variant={ordersService.getStatusColor(ord.status)} style={{ paddingVertical: 1 }}>
                        {ord.status}
                      </Badge>
                    </View>
                    <Text style={styles.orderPrice}>
                      {productService.formatPrice(ord.totalPrice)}
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {ord.order.shippingAddress?.fullName || ord.order.customerEmail || 'Customer'}
                    </Text>
                    <Text style={styles.orderDate}>
                      {ordersService.formatDate(ord.createdAt)} • {ord.items.length} item(s)
                    </Text>
                  </View>

                  <View style={styles.cardFooterRow}>
                    <Text style={styles.viewDetailText}>View order &amp; fulfillment details</Text>
                    <ChevronRight size={14} color={Colors.purpleLight} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <ShoppingBag size={40} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyText}>No orders match your filter.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    padding: 16,
    paddingBottom: 8,
  },
  statusTabs: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  statusTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  statusTabActive: {
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
  },
  statusTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'uppercase',
  },
  statusTabTextActive: {
    color: Colors.purpleLight,
  },
  listContent: {
    padding: 16,
    paddingTop: 6,
    paddingBottom: 32,
  },
  orderCard: {
    padding: 14,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    paddingBottom: 10,
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  orderPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardBody: {
    marginBottom: 10,
  },
  customerName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  orderDate: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  viewDetailText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.purpleLight,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 8,
  },
});
