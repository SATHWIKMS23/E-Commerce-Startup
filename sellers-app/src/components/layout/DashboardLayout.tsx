'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShop } from '@/features/shop/hooks/useShop';
import { useUIStore } from '@/lib/store/uiStore';
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
} from 'lucide-react';
import { Badge } from '@/shared/components/Badge';

import { useConfirmStore } from '@/lib/store/confirmStore';
import { useSellerLayout } from '@/lib/hooks/useSellerLayout';
import { SellerNotificationDropdown } from '@/features/notifications/ui/SellerNotificationDropdown';
import { useSidebarBadges } from '@/features/notifications/hooks/useNotifications';
import type { SidebarBadges } from '@/features/notifications/api/notificationApi';

const getIconForItem = (path?: string) => {
  switch (path) {
    case '/dashboard':
    case '/seller/dashboard':
      return LayoutDashboard;
    case '/products':
    case '/seller/products':
      return Box;
    case '/orders':
    case '/seller/orders':
      return ShoppingBag;
    case '/custom-orders':
      return Wrench;
    case '/analytics':
    case '/seller/analytics':
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
    case '/seller/settings':
      return Settings;
    default:
      return LayoutDashboard;
  }
};

const getBadgeForItem = (path: string | undefined, badges: SidebarBadges): number => {
  switch (path) {
    case '/orders':
    case '/seller/orders':
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

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { shop } = useShop();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const pathname = usePathname();
  const showConfirm = useConfirmStore((state) => state.showConfirm);
  const { sidebar, branding } = useSellerLayout();
  const { badges } = useSidebarBadges();
  const [logoError, setLogoError] = React.useState(false);

  React.useEffect(() => {
    setLogoError(false);
  }, [branding?.logo]);

  const sellerPortalName = React.useMemo(() => {
    const raw = (branding?.sellerPortalTitle || branding?.name || '').trim();
    return raw || 'Seller Portal';
  }, [branding?.sellerPortalTitle, branding?.name]);

  const sellerPortalTagline = branding?.sellerPortalTagline || branding?.tagline || 'Manage your storefront, products, and incoming orders.';
  const hasValidLogo = Boolean(!logoError && branding?.logo && branding.logo.trim() !== '');

  const handleLogout = () => {
    showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your seller portal?',
      confirmText: 'Sign Out',
      onConfirm: async () => {
        await logout();
      },
    });
  };

  const shopStatusLabel = () => {
    if (!shop) return 'No Shop Setup';
    return shop.status;
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
    <div className="min-h-screen bg-background text-foreground flex noise-bg relative overflow-x-hidden">
      {/* Sidebar Backdrop Overlay for Mobile */}
      {sidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden cursor-pointer"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] border-r border-white/5 bg-[#07070a]/95 md:bg-[#07070a]/90 backdrop-blur-md transition-transform duration-300 md:translate-x-0 md:static shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Logo */}
          <Link
            href="/dashboard"
            className="h-16 flex items-center px-5 border-b border-white/5 gap-3 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-white overflow-hidden shrink-0 shadow-sm">
              {hasValidLogo ? (
                <img
                  src={branding.logo}
                  alt={sellerPortalName}
                  className="h-full w-full object-contain p-1"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Store className="h-4.5 w-4.5 text-purple-400" />
              )}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-white text-xs tracking-tight block truncate">
                {sellerPortalName}
              </span>
              <span className="text-[9px] text-white/40 block font-medium truncate tracking-wide">
                {sellerPortalTagline}
              </span>
            </div>
          </Link>

          {/* Shop Selector / Indicator */}
          {shop && (
            <div className="p-3.5 mx-3.5 my-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {shop.logoUrl ? (
                    <img src={shop.logoUrl} alt={shop.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-5 w-5 text-white/30" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white/95 line-clamp-1">{shop.name}</h4>
                  <div className="mt-0.5">
                    <Badge variant={shopStatusVariant()} className="text-[8px] py-0 px-1.5 font-bold">
                      {shopStatusLabel()}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nav links */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {sidebar.map((item) => {
              const Icon = getIconForItem(item.path);
              const itemPath = item.path || '/dashboard';
              const isAllowed = 
                shop?.status === 'APPROVED' || 
                itemPath === '/dashboard' || 
                itemPath === '/profile' || 
                itemPath === '/shop' || 
                itemPath === '/settings' || 
                itemPath === '/notifications' ||
                itemPath === '/enforcement' ||
                itemPath === '/policies' ||
                itemPath === '/commission-statements' ||
                itemPath === '/support-chat';

              if (!isAllowed) return null;

              const badgeCount = getBadgeForItem(itemPath, badges);
              const isActive = pathname === itemPath || (itemPath !== '/dashboard' && itemPath !== '/' && pathname.startsWith(itemPath));

              return (
                <Link
                  key={item.id || itemPath}
                  href={itemPath}
                  onClick={() => {
                    if (window.innerWidth < 768 && sidebarOpen) {
                      toggleSidebar();
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-purple-600/10 text-purple-400 border border-purple-500/15 shadow-sm'
                      : 'text-white/60 hover:text-white/95 hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                  {badgeCount > 0 && (
                    <span className="ml-auto flex items-center justify-center min-w-[18px] h-4.5 px-1.5 text-[10px] font-extrabold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-900/60 to-indigo-900/60 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10 shrink-0">
                {user?.firstName?.[0] || 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-white/90 line-clamp-1">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="block text-[10px] text-white/40 truncate">{user?.email}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full h-9 rounded-xl glass text-xs font-bold text-white/70 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-[#07070a]/60 backdrop-blur-md flex items-center justify-between px-6 z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05] transition-all md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium">
              <Link
                href="/dashboard"
                className="text-white/40 hover:text-purple-400 font-semibold transition-colors flex items-center gap-1"
              >
                <span>{sellerPortalName}</span>
              </Link>
              <ChevronRight className="h-3 w-3 text-white/20 shrink-0" />
              <span className="text-white/90 font-bold capitalize select-none" aria-current="page">
                {pathname === '/dashboard' || pathname === '/'
                  ? 'Overview'
                  : (pathname || '').replace(/^\//, '').split('/')[0].replace(/-/g, ' ')}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick stats indicator */}
            {shop && shop.status !== 'APPROVED' && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-[10px] font-bold text-yellow-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Shop {shop.status} - Awaiting Approval</span>
              </div>
            )}

            {/* Notification trigger dropdown */}
            <SellerNotificationDropdown />
          </div>
        </header>

        {/* Warning Banners */}
        {shop && shop.status !== 'APPROVED' && (
          <div className="px-6 pt-6 animate-fade-in">
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              shop.status === 'REJECTED' || shop.status === 'SUSPENDED'
                ? 'border-red-500/20 bg-red-500/5'
                : 'border-yellow-500/20 bg-yellow-500/5'
            }`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                shop.status === 'REJECTED' || shop.status === 'SUSPENDED' || shop.status === 'DISABLED'
                  ? 'text-red-400'
                  : 'text-yellow-400'
              }`} />
              <div>
                <h5 className={`text-xs font-bold ${
                  shop.status === 'REJECTED' || shop.status === 'SUSPENDED' || shop.status === 'DISABLED'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}>
                  {shop.status === 'PENDING' && 'Shop Awaiting Approval'}
                  {shop.status === 'REJECTED' && 'Shop Approval Rejected'}
                  {shop.status === 'SUSPENDED' && 'Shop Suspended'}
                  {shop.status === 'DISABLED' && 'Shop Disabled'}
                </h5>
                <p className="text-[11px] text-white/60 leading-relaxed mt-1">
                  {shop.status === 'PENDING' && 'Your shop is awaiting admin approval. Some features are restricted until approved.'}
                  {shop.status === 'REJECTED' && `Your shop was rejected. Reason: "${shop.rejectionReason || 'N/A'}". Contact support for more information.`}
                  {shop.status === 'SUSPENDED' && 'Your shop has been suspended. Contact support for more information.'}
                  {shop.status === 'DISABLED' && 'Your shop has been disabled by an administrator.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
