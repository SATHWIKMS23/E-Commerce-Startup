import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNotifications } from '../hooks/useNotifications';
import { ordersService } from '@/features/orders/services/ordersService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  Bell,
  Check,
  Trash2,
  ShieldAlert,
  ShoppingBag,
  Store,
  CreditCard,
  MessageSquare,
  FileText,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

type FilterTab = 'ALL' | 'UNREAD' | 'ORDERS' | 'SHOP' | 'SUPPORT';

function getNotificationIcon(type: string) {
  if (type.startsWith('ORDER')) return <ShoppingBag size={16} color={Colors.purpleLight} />;
  if (type.startsWith('SHOP')) return <Store size={16} color={Colors.emerald} />;
  if (type.startsWith('PAYOUT') || type.startsWith('COMMISSION')) return <CreditCard size={16} color={Colors.cyan} />;
  if (type.startsWith('SELLER_STRIKE') || type.startsWith('SELLER_WARNING')) return <ShieldAlert size={16} color={Colors.rose} />;
  if (type.startsWith('NEW_POLICY') || type.startsWith('NEW_GUIDELINE')) return <FileText size={16} color={Colors.yellow} />;
  if (type === 'NEW_MESSAGE') return <MessageSquare size={16} color={Colors.indigo} />;
  return <Bell size={16} color={Colors.purpleLight} />;
}

interface NotificationsPageProps {
  navigation: any;
}

export function NotificationsPage({ navigation }: NotificationsPageProps) {
  const [filter, setFilter] = useState<FilterTab>('ALL');

  const {
    notifications,
    unreadCount,
    isLoading,
    refetch,
    markAllRead,
    markRead,
    deleteNotification,
  } = useNotifications({ unreadOnly: filter === 'UNREAD' });

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'ALL' || filter === 'UNREAD') return true;
    if (filter === 'ORDERS') return notif.type.startsWith('ORDER');
    if (filter === 'SHOP')
      return (
        notif.type.startsWith('SHOP') ||
        notif.type.startsWith('SELLER_') ||
        notif.type.startsWith('NEW_POLICY')
      );
    if (filter === 'SUPPORT') return notif.type === 'NEW_MESSAGE';
    return true;
  });

  const handleCardClick = async (notif: any) => {
    if (!notif.isRead) {
      try {
        await markRead(notif.id);
      } catch (err) {
        // ignore
      }
    }
    if (notif.type.startsWith('ORDER')) navigation.navigate('Orders');
    else if (notif.type.startsWith('SHOP')) navigation.navigate('ShopSettings');
    else if (notif.type.startsWith('SELLER_')) navigation.navigate('Enforcement');
    else if (notif.type.startsWith('COMMISSION')) navigation.navigate('CommissionStatements');
    else if (notif.type === 'NEW_MESSAGE') navigation.navigate('SupportChat');
    else if (notif.type.startsWith('NEW_POLICY')) navigation.navigate('Policies');
  };

  return (
    <DashboardLayout title="Notifications" navigation={navigation} currentRoute="/notifications">
      <View style={styles.container}>
        {/* Top Header Row */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread message(s)` : 'All caught up!'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onPress={() => markAllRead()}
              icon={<Check size={14} color="#ffffff" />}
            >
              Mark all read
            </Button>
          )}
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabs}
        >
          {(['ALL', 'UNREAD', 'ORDERS', 'SHOP', 'SUPPORT'] as FilterTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Notifications List */}
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
              <Skeleton height={75} borderRadius={14} />
              <Skeleton height={75} borderRadius={14} />
              <Skeleton height={75} borderRadius={14} />
            </View>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => (
              <TouchableOpacity
                key={notif.id}
                onPress={() => handleCardClick(notif)}
                activeOpacity={0.75}
              >
                <Card style={[styles.notifCard, !notif.isRead && styles.unreadCard]}>
                  <View style={styles.notifRow}>
                    <View style={styles.iconBox}>{getNotificationIcon(notif.type)}</View>

                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={[styles.notifTitle, !notif.isRead && styles.unreadTitle]}>
                        {notif.title}
                      </Text>
                      <Text style={styles.notifBody} numberOfLines={2}>
                        {notif.message || notif.body || 'New notification update'}
                      </Text>
                      <Text style={styles.notifTime}>
                        {ordersService.formatDate(notif.createdAt)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => deleteNotification(notif.id)}
                      style={styles.delBtn}
                    >
                      <Trash2 size={14} color="rgba(255, 255, 255, 0.35)" />
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Bell size={40} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyText}>No notifications in this view.</Text>
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
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
  filterTabs: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  filterTabActive: {
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
  },
  filterTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'uppercase',
  },
  filterTabTextActive: {
    color: Colors.purpleLight,
  },
  listContent: {
    padding: 16,
    paddingTop: 6,
    paddingBottom: 32,
  },
  notifCard: {
    padding: 12,
    marginBottom: 8,
  },
  unreadCard: {
    borderColor: 'rgba(168, 85, 247, 0.25)',
    backgroundColor: 'rgba(168, 85, 247, 0.04)',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    height: 38,
    width: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  unreadTitle: {
    fontWeight: '800',
    color: Colors.purpleLight,
  },
  notifBody: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 15,
  },
  notifTime: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 3,
  },
  delBtn: {
    padding: 6,
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
