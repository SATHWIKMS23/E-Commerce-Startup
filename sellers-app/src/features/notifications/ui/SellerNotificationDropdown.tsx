'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  ShoppingBag,
  Store,
  CreditCard,
  MessageSquare,
  FileText,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationRecord } from '../api/notificationApi';

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

function getNotificationIcon(type: string) {
  if (type.startsWith('ORDER')) return <ShoppingBag className="h-4 w-4 text-purple-400" />;
  if (type.startsWith('SHOP')) return <Store className="h-4 w-4 text-emerald-400" />;
  if (type.startsWith('PAYOUT') || type.startsWith('COMMISSION')) return <CreditCard className="h-4 w-4 text-cyan-400" />;
  if (type.startsWith('SELLER_STRIKE') || type.startsWith('SELLER_WARNING')) return <ShieldAlert className="h-4 w-4 text-rose-400" />;
  if (type.startsWith('NEW_POLICY') || type.startsWith('NEW_GUIDELINE')) return <FileText className="h-4 w-4 text-amber-400" />;
  if (type === 'NEW_MESSAGE') return <MessageSquare className="h-4 w-4 text-indigo-400" />;
  return <Bell className="h-4 w-4 text-purple-400" />;
}

function getDestinationRoute(notif: NotificationRecord): string {
  if (notif.route) return notif.route;
  if (notif.data?.route) return notif.data.route;
  if (notif.data?.link) return notif.data.link;
  if (notif.type.startsWith('ORDER')) return '/orders';
  if (notif.type.startsWith('SHOP')) return '/shop';
  if (notif.type.startsWith('SELLER_')) return '/enforcement';
  if (notif.type.startsWith('COMMISSION')) return '/commission-statements';
  if (notif.type === 'NEW_MESSAGE') return '/support-chat';
  return '/notifications';
}

export function SellerNotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    isMarkingAllRead,
  } = useNotifications({ limit: 8 });

  // Close on Click Outside or Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: NotificationRecord) => {
    if (!notif.isRead) {
      try {
        await markRead(notif.id);
      } catch (err) {
        console.error(err);
      }
    }
    setIsOpen(false);
    const destination = getDestinationRoute(notif);
    router.push(destination);
  };

  const handleSingleMarkRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await markRead(id);
    } catch (err) {
      console.error(err);
    }
  };

  const recentNotifications = notifications.slice(0, 8);

  return (
    <div ref={containerRef} className="relative">
      {/* Header Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl glass hover:border-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
        aria-label="Seller notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-purple-600 text-[9px] font-black text-white shadow-sm ring-2 ring-[#07070a]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[min(380px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-[#07070a]/95 backdrop-blur-2xl shadow-2xl overflow-hidden z-50 text-white animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                disabled={isMarkingAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.05]">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
                <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
                <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
              </div>
            ) : recentNotifications.length > 0 ? (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-3 p-3.5 transition-all cursor-pointer group hover:bg-white/[0.04] ${
                    notif.isRead ? 'opacity-70' : 'bg-purple-950/15'
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 shrink-0 group-hover:border-purple-500/30 transition-colors">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white truncate leading-tight">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-white/40 font-medium shrink-0">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                      {notif.body || notif.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    {!notif.isRead && (
                      <button
                        onClick={(e) => handleSingleMarkRead(e, notif.id)}
                        title="Mark as read"
                        className="p-1 rounded text-white/40 hover:text-purple-400 hover:bg-white/10 transition-colors"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 mx-auto text-white/30">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-white/70">All caught up</p>
                <p className="text-[10px] text-white/40 max-w-[200px] mx-auto">
                  No recent notifications logged for your seller account.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-white/[0.08] bg-white/[0.01]">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-xs font-bold text-white/75 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              <span>View all notifications</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
