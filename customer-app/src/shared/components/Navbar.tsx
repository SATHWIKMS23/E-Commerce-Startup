'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useUIStore } from '@/lib/store/uiStore';
import { ShoppingCart, Bell, User, LayoutDashboard, LogOut, Store, Menu, X, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { shopListApi } from '@/features/shops/shop-list/api/shopListApi';
import { useLocationStore } from '@/lib/store/locationStore';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import type { ProfileResponse } from '@/features/auth/profile/api/profileApi';
import { BrandLogo } from './BrandLogo';
import { useSiteLayout } from '@/lib/hooks/useSiteLayout';
import { CustomerNotificationDropdown } from '@/features/notifications/ui/CustomerNotificationDropdown';

// ─── Shop Names Marquee ───────────────────────────────────────────────────────

function ShopMarquee() {
  const { data, isLoading } = useQuery({
    queryKey: ['shops', { searchQuery: undefined, coords: null, radius: 50 }],
    queryFn: () => shopListApi.getFeaturedShops(24),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const shops = data?.shops || [];

  return (
    <div className="border-t border-white/[0.06] bg-white/[0.015] min-h-[29px] overflow-hidden marquee-container flex items-center">
      {isLoading ? (
        <div className="py-1 px-6 flex gap-6 overflow-hidden w-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-glass h-3 rounded-full flex-shrink-0" style={{ width: `${56 + i * 14}px` }} />
          ))}
        </div>
      ) : shops.length > 0 ? (
        <div className="marquee-track flex items-center gap-0.5 py-1">
          {[...shops, ...shops].map((shop, i) => (
            <Link
              key={`${shop.id}-${i}`}
              href={`/shops/${shop.slug || shop.id}`}
              className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-medium text-white/40 hover:text-white hover:bg-white/[0.06] transition-all whitespace-nowrap group"
            >
              <Store className="h-2.5 w-2.5 text-white/25 group-hover:text-white/70 transition-colors" />
              {shop.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Location Chip ────────────────────────────────────────────────────────────

function LocationChip({ profile, short }: { profile: ProfileResponse | undefined; short?: boolean }) {
  const { selectedAddressId, selectedDistrict, selectedState, setAddressSelectorOpen } = useLocationStore();

  const activeAddress =
    profile?.user?.addresses?.find((address) => address.id === selectedAddressId) ||
    profile?.user?.addresses?.find((address) => address.isDefault) ||
    profile?.user?.addresses?.[0];

  const city = activeAddress?.city || selectedDistrict || 'Select';
  const state = activeAddress?.state || selectedState || 'Location';
  const label = short ? city : `${city}, ${state}`;

  return (
    <button
      onClick={() => setAddressSelectorOpen(true)}
      className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/15 text-[10px] font-bold text-white/80 transition-all cursor-pointer shadow-sm select-none whitespace-nowrap shrink-0"
    >
      <span>📍</span>
      <span className="truncate max-w-[100px]">{label}</span>
      <span className="text-[8px] text-white/30">▼</span>
    </button>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export function Navbar() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const setCartOpen = useUIStore((state) => state.setCartOpen);
  const searchOpen = useUIStore((state) => state.searchOpen);
  const setSearchOpen = useUIStore((state) => state.setSearchOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  // Close dropdown on route change
  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [searchOpen, setSearchOpen]);

  // Prevent body scroll while either full-screen navigation panel is open
  useEffect(() => {
    if (mobileNavOpen || searchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen, searchOpen]);

  const { refs, floatingStyles } = useFloating({
    open: menuOpen,
    placement: 'bottom-end',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const { setLocation } = useLocationStore();

  const { data: profile } = useQuery<ProfileResponse>({
    queryKey: ['profile'],
    queryFn: async () => (await axiosInstance.get('/api/auth/profile')).data,
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Load default address from profile if not set yet
  const { selectedAddressId } = useLocationStore();
  useEffect(() => {
    if (session && profile?.user?.addresses?.length) {
      const defaultAddr = profile.user.addresses.find((address) => address.isDefault) || profile.user.addresses[0];
      if (defaultAddr && !selectedAddressId) {
        setLocation(defaultAddr.id, defaultAddr.state, defaultAddr.city);
      }
    }
  }, [session, profile, selectedAddressId, setLocation]);

  // Invalidate queries when location actually changes after initial mount
  const { selectedDistrict, selectedState } = useLocationStore();
  const prevLocationRef = useRef<{ district: string; state: string } | null>(null);
  useEffect(() => {
    if (!prevLocationRef.current) {
      prevLocationRef.current = { district: selectedDistrict, state: selectedState };
      return;
    }
    const hasChanged =
      prevLocationRef.current.district !== selectedDistrict ||
      prevLocationRef.current.state !== selectedState;

    if (hasChanged && selectedDistrict && selectedState) {
      prevLocationRef.current = { district: selectedDistrict, state: selectedState };
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['featured-shops'] });
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      queryClient.invalidateQueries({ queryKey: ['nearby-shops'] });
    }
  }, [selectedDistrict, selectedState, queryClient]);

  const { data: cartData } = useQuery<{ cart?: { items?: Array<{ quantity: number }> } }>({
    queryKey: ['cart'],
    queryFn: async () => (await axiosInstance.get('/api/cart')).data,
    enabled: !!session,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const cartCount = cartData?.cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  const { data: notifData } = useQuery<{ unreadCount?: number; notifications?: Array<{ isRead: boolean }> }>({
    queryKey: ['notifications'],
    queryFn: async () => (await axiosInstance.get('/api/notifications')).data,
    enabled: !!session,
    refetchInterval: 60_000,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const unreadCount = notifData?.unreadCount ?? (notifData?.notifications?.filter((notification) => !notification.isRead).length || 0);

  const { navbar: dynamicNavbar } = useSiteLayout();

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Main bar */}
      <div className="glass border-b border-white/[0.08] backdrop-blur-xl bg-black/60">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-3">

            {/* ── Brand (logo + name) ── shrink-0 so it never collapses */}
            <div className="flex items-center shrink-0 min-w-0">
              <BrandLogo
                textClassName="block max-w-[calc(100vw-180px)] truncate text-[13px] sm:text-base 2xl:text-lg font-black tracking-tight text-white"
                logoSizeClassName="h-8 w-8"
              />
            </div>

            {/* ── Location chip: desktop only (hidden on mobile to save space) ── */}
            <div className="hidden 2xl:flex shrink-0">
              <LocationChip profile={profile} />
            </div>

            {/* ── Desktop Navigation — grows to fill available space ── */}
            <nav className="hidden 2xl:flex items-center justify-center gap-0.5 flex-1 min-w-0">
              {dynamicNavbar.map((item) => (
                <Link
                  key={item.id}
                  href={item.path || '/'}
                  className="px-3 py-2 rounded-lg text-[13px] font-medium text-white/55 hover:text-white hover:bg-white/[0.07] transition-all duration-150 whitespace-nowrap"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* ── Medium breakpoint: spacer to push actions right ── */}
            <div className="hidden sm:block 2xl:hidden flex-1" />

            {/* ── Right Actions ── */}
            <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">

              {/* Search */}
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  setSearchOpen(true);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
                aria-label="Search products"
                aria-expanded={searchOpen}
              >
                <Search className="h-5 w-5 2xl:h-[19px] 2xl:w-[19px]" />
              </button>

              {/* Customer Notifications Dropdown */}
              {session && (
                <div className="flex items-center">
                  <CustomerNotificationDropdown />
                </div>
              )}

              {/* Cart Button */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
              >
                <ShoppingCart className="h-4.5 w-4.5" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[8px] font-black text-black">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User Dropdown — desktop only */}
              {session ? (
                <div className="relative hidden 2xl:block ml-1 pl-2 border-l border-white/[0.08]">
                  <button
                    ref={refs.setReference}
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.07] transition-all cursor-pointer"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full overflow-hidden ring-1 ring-white/20 bg-white/10">
                      {session.user?.image
                        ? <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                        : <User className="h-3.5 w-3.5 text-white/80" />
                      }
                    </div>
                    <span className="text-xs font-semibold text-white/75 max-w-[80px] truncate">
                      {session.user?.name || 'Account'}
                    </span>
                  </button>

                  {menuOpen && typeof window !== 'undefined' && createPortal(
                    <>
                      <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
                      <div ref={refs.setFloating} className="z-[9999] w-52 glass-card p-1.5 animate-in fade-in slide-in-from-top-1 duration-100"
                        style={floatingStyles}>
                        <div className="px-3 py-2.5 border-b border-white/[0.07] mb-1">
                          <p className="text-xs font-bold text-white truncate">{session.user?.name}</p>
                          <p className="text-[10px] text-white/40 truncate mt-0.5">{session.user?.email}</p>
                        </div>
                        {[
                          { href: '/profile', icon: User, label: 'My Profile' },
                          { href: '/orders', icon: LayoutDashboard, label: 'My Orders' },
                          { href: '/wishlist', icon: ShoppingCart, label: 'My Wishlist' },
                        ].map(({ href, icon: Icon, label }) => (
                          <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </Link>
                        ))}
                        <div className="border-t border-white/[0.07] mt-1 pt-1">
                          <button onClick={() => { setMenuOpen(false); signOut(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer text-left">
                            <LogOut className="h-3.5 w-3.5" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              ) : (
                <div className="hidden 2xl:flex items-center gap-2">
                  <Link href="/login">
                    <button className="h-9 px-4 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer">
                      Sign In
                    </button>
                  </Link>
                  <Link href="/signup">
                    <button className="h-9 px-4 rounded-xl text-sm font-bold btn-primary cursor-pointer">
                      Sign Up
                    </button>
                  </Link>
                </div>
              )}

              {/* Mobile / tablet menu toggle — shown below lg */}
              <button
                className="2xl:hidden flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                aria-label="Toggle Navigation Menu"
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile / tablet Nav Drawer — used when the full desktop navigation does not fit */}
        {mobileNavOpen && (
          <div className="2xl:hidden border-t border-white/[0.08] bg-black/95 backdrop-blur-2xl px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[calc(100dvh-56px)] overflow-y-auto">

            {/* Location — moved into mobile menu */}
            <div className="pb-3 border-b border-white/[0.08]">
              <LocationChip profile={profile} />
            </div>

            {session ? (
              <div className="px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 mb-2 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{session.user?.name}</p>
                  <p className="text-[10px] text-white/40 truncate">{session.user?.email}</p>
                </div>
                <Link href="/profile" onClick={() => setMobileNavOpen(false)} className="text-[10px] font-bold text-purple-400 hover:underline ml-3 shrink-0">
                  Profile
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Link href="/login" onClick={() => setMobileNavOpen(false)}>
                  <button className="w-full h-10 rounded-xl text-xs font-bold text-white bg-white/10 border border-white/15">
                    Sign In
                  </button>
                </Link>
                <Link href="/signup" onClick={() => setMobileNavOpen(false)}>
                  <button className="w-full h-10 rounded-xl text-xs font-bold btn-primary">
                    Sign Up
                  </button>
                </Link>
              </div>
            )}

            {/* Primary Nav Items */}
            <div className="space-y-0.5 border-b border-white/[0.08] pb-3">
              {dynamicNavbar.map((item) => (
                <Link key={item.id} href={item.path || '/'} onClick={() => setMobileNavOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-white/75 hover:text-white hover:bg-white/[0.07] transition-all">
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Account Quick Links */}
            {session && (
              <div className="space-y-0.5 pt-1">
                {[
                  { href: '/profile', icon: User, label: 'My Profile' },
                  { href: '/orders', icon: LayoutDashboard, label: 'My Orders' },
                  { href: '/wishlist', icon: ShoppingCart, label: 'My Wishlist' },
                  { href: '/notifications', icon: Bell, label: `Notifications${unreadCount > 0 ? ` (${unreadCount > 99 ? '99+' : unreadCount})` : ''}` },
                ].map(({ href, icon: Icon, label }) => (
                  <Link key={href} href={href} onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                ))}
                <button onClick={() => { setMobileNavOpen(false); signOut(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer text-left mt-2">
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {searchOpen && typeof window !== 'undefined' && createPortal(
        <>
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
            className="fixed inset-0 z-[100] bg-black/70 sm:bg-black/35"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
            className="fixed inset-0 z-[101] bg-[#080808] p-3 sm:inset-auto sm:top-[4.5rem] sm:right-4 sm:w-[min(28rem,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#111] sm:p-3 sm:shadow-2xl"
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const query = searchQuery.trim();
                if (!query) return;
                setSearchOpen(false);
                router.push(`/products?q=${encodeURIComponent(query)}`);
              }}
              className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 sm:h-11"
            >
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Back"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/[0.07] sm:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Search className="h-5 w-5 shrink-0 text-white/40" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/[0.07] sm:flex"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="submit"
                aria-label="Submit search"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-black hover:bg-white/85"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </>,
        document.body
      )}

      {/* Shop ticker */}
      <ShopMarquee />
    </header>
  );
}
