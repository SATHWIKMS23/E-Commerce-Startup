import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useCustomOrders } from '../hooks/useCustomOrders';
import { customOrderService } from '../services/customOrderService';
import { ordersService } from '@/features/orders/services/ordersService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { Search, Wrench, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface CustomOrdersPageProps {
  navigation: any;
}

export function CustomOrdersPage({ navigation }: CustomOrdersPageProps) {
  const { customOrders, isLoading, refetch } = useCustomOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const statuses = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'QUOTED', 'ACCEPTED', 'CANCELLED'];

  const filteredOrders = customOrders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.material && o.material.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' ? true : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout title="Custom Requests" navigation={navigation} currentRoute="/custom-orders">
      <View style={styles.container}>
        {/* Search */}
        <View style={styles.topBar}>
          <Input
            placeholder="Search custom requests by title or material…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={{ marginBottom: 0 }}
            icon={<Search size={16} color={Colors.textMuted} />}
          />
        </View>

        {/* Filter Tabs */}
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
                {st.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List Content */}
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
            </View>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((ord) => (
              <TouchableOpacity
                key={ord.id}
                onPress={() => navigation.navigate('CustomOrderDetail', { id: ord.id })}
                activeOpacity={0.75}
              >
                <Card style={styles.orderCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.orderNumber}>{ord.orderNumber}</Text>
                      <Badge
                        variant={customOrderService.getStatusBadgeVariant(ord.status)}
                        style={{ paddingVertical: 1 }}
                      >
                        {ord.status.replace('_', ' ')}
                      </Badge>
                    </View>
                    <Text style={styles.fileCount}>
                      {ord.files.length} CAD/file(s)
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.titleText} numberOfLines={1}>
                      {ord.title}
                    </Text>
                    <Text style={styles.descText} numberOfLines={2}>
                      {ord.description}
                    </Text>
                    {ord.material ? (
                      <Text style={styles.metaText}>
                        Material: <Text style={{ color: '#ffffff' }}>{ord.material}</Text> • Qty: {ord.quantity}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.cardFooterRow}>
                    <Text style={styles.dateText}>
                      Submitted {ordersService.formatDate(ord.submittedAt)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.quoteLink}>Review &amp; Quote</Text>
                      <ChevronRight size={14} color={Colors.purpleLight} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Wrench size={40} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyText}>No custom print requests found.</Text>
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
  fileCount: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 10,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  descText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  dateText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  quoteLink: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.purpleLight,
    marginRight: 2,
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
