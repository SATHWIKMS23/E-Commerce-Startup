'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../hooks/useNotifications';
import { ordersService } from '@/features/orders/services/ordersService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/shared/components/Card';
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
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import type { NotificationRecord } from '../api/notificationApi';

type FilterTab = 'ALL' | 'UNREAD' | 'ORDERS' | 'SHOP' | 'SUPPORT';

function getNotificationIcon(type: string) {
  if (type.startsWith('ORDER')) return <ShoppingBag className="h-4 w-4 text-purple-400" />;
  if (type.startsWith('SHOP')) return <Store className="h-4 w-4 text-emerald-400" />;
  if (type.startsWith('PAYOUT') || type.startsWith('COMMISSION')) return <CreditCard className="h-4 w-4 text-cyan-400" />;
  if (type.startsWith('SELLER_STRIKE') || type.startsWith('SELLER_WARNING')) return <ShieldAlert className="h-4 w-4 text-rose-400" />;
  if (type.startsWith('NEW_POLICY') || type.startsWith('NEW_GUIDELINE')) return <FileText className="h-4 w-4 text-amber-400" />;
  if (type === 'NEW_MESSAGE') return <MessageSquare className="h-4 w-4 text-indigo-400" />;
  return <Bell className="h-4 w-4 text-purple-400" />;
}

function getDestinationRoute(notif: NotificationRecord): string | null {
  if (notif.route) return notif.route;
  if (notif.data?.route) return notif.data.route;
  if (notif.data?.link) return notif.data.link;
  if (notif.type.startsWith('ORDER')) return '/orders';
  if (notif.type.startsWith('SHOP')) return '/shop';
  if (notif.type.startsWith('SELLER_')) return '/enforcement';
  if (notif.type.startsWith('COMMISSION')) return '/commission-statements';
  if (notif.type === 'NEW_MESSAGE') return '/support-chat';
  return null;
}

export function NotificationsPage() {
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [page, setPage] = useState(1);
  const router = useRouter();

  const queryOptions = {
    page,
    limit: 15,
    unreadOnly: filter === 'UNREAD',
  };

  const {
    notifications,
    unreadCount,
    count,
    totalPages,
    isLoading,
    isError,
    markAllRead,
    markRead,
    deleteNotification,
  } = useNotifications(queryOptions);

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'ALL' || filter === 'UNREAD') return true;
    if (filter === 'ORDERS') return notif.type.startsWith('ORDER');
    if (filter === 'SHOP') return notif.type.startsWith('SHOP') || notif.type.startsWith('SELLER_') || notif.type.startsWith('NEW_POLICY');
    if (filter === 'SUPPORT') return notif.type === 'NEW_MESSAGE';
    return true;
  });

  const handleCardClick = async (notif: NotificationRecord) => {
    if (!notif.isRead) {
      try {
        await markRead(notif.id);
      } catch (err) {
        console.error(err);
      }
    }
    const destination = getDestinationRoute(notif);
    if (destination) {
      router.push(destination);
    }
  };

  const handleMarkRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await markRead(id);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl animate-fade-up">
        {/* Title and top action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white/95">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-white/45">
              Stay updated with incoming orders, shop compliance, platform policies, and support messages.
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-[11px] h-8 font-bold border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-white/5 pb-2 overflow-x-auto text-xs font-semibold">
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'UNREAD', label: `Unread (${unreadCount})` },
              { key: 'ORDERS', label: 'Orders' },
              { key: 'SHOP', label: 'Shop & Compliance' },
              { key: 'SUPPORT', label: 'Support' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 font-bold'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-400 glass-card">
            <ShieldAlert className="mx-auto h-10 w-10 text-red-400/60 mb-2" />
            <p className="text-sm font-semibold">Failed to load notifications.</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-2.5">
            {filteredNotifications.map((notif) => {
              const destination = getDestinationRoute(notif);

              return (
                <Card
                  key={notif.id}
                  onClick={() => handleCardClick(notif)}
                  className={`border transition-all cursor-pointer group hover:border-purple-500/30 ${
                    notif.isRead
                      ? 'border-white/5 bg-white/[0.005] opacity-75 hover:opacity-100'
                      : 'border-purple-500/20 bg-purple-500/[0.03] shadow-sm'
                  }`}
                >
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                          notif.isRead
                            ? 'border-white/10 bg-white/5 text-white/40'
                            : 'border-purple-500/30 bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20'
                        }`}
                      >
                        {getNotificationIcon(notif.type)}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="block text-xs font-bold text-white/95">
                            {notif.title}
                          </span>
                          {!notif.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                          )}
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">
                          {notif.body || notif.message}
                        </p>
                        <div className="flex items-center gap-3 pt-0.5">
                          <span className="text-[10px] text-white/35 font-medium">
                            {ordersService.formatDate(notif.createdAt)}
                          </span>
                          {destination && (
                            <span className="text-[10px] font-bold text-purple-400/80 group-hover:text-purple-300 flex items-center gap-0.5">
                              <span>Open record</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {!notif.isRead && (
                        <button
                          onClick={(e) => handleMarkRead(e, notif.id)}
                          title="Mark as read"
                          className="text-white/40 hover:text-purple-400 p-1.5 rounded-lg hover:bg-white/[0.05] transition-all cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, notif.id)}
                        title="Delete notification"
                        className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/[0.05] transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-white/60">
                <span>
                  Showing {filteredNotifications.length} of {count} notifications
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs font-semibold"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>
                  <span className="px-2 font-bold text-white/80">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 text-xs font-semibold"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-16 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl glass mx-auto text-white/30">
              <Bell className="h-6 w-6" />
            </div>
            <h4 className="text-xs font-bold text-white/70">
              {filter === 'UNREAD' ? 'No unread notifications' : 'All caught up'}
            </h4>
            <p className="text-[10px] text-white/35 max-w-xs mx-auto leading-relaxed">
              {filter === 'UNREAD'
                ? 'You have reviewed all current notifications.'
                : 'No notifications logged for your seller account in this category.'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
