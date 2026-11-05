'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { useShopList } from '@/features/shops/shop-list/hooks/useShopList';
import { shopListService } from '@/features/shops/shop-list/services/shopListService';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  ArrowRight, MapPin, Store, Printer,
  Paintbrush, Home as HomeIcon, Shirt, Cpu,
  Users, Clock, ShieldCheck, ChevronRight, Grid3X3,
} from 'lucide-react';
import Link from 'next/link';
import { useSiteLayout } from '@/lib/hooks/useSiteLayout';
import { DEFAULT_BRANDING } from '@/lib/services/brandingService';

const valueProps = [
  { icon: Users,       title: 'Support Local Crafters', desc: 'Every purchase goes directly to independent local makers in your area.' },
  { icon: Printer,     title: 'Regional Custom Prints',  desc: 'Commission and print locally to reduce carbon footprint.' },
  { icon: Clock,       title: 'Fast Turnaround',         desc: 'Same-day pickup or lightning-fast regional delivery.' },
  { icon: ShieldCheck, title: 'Secure Payments',         desc: 'End-to-end encrypted transactions powered by Stripe.' },
];

function ShopCard({ shop, index }: { shop: any; index: number }) {
  const banner = shop.bannerUrl
    ? `url(${shop.bannerUrl})`
    : shopListService.getPlaceholderBanner(shop.name);

  return (
    <Link
      href={`/shops/${shop.slug || shop.id}`}
      className="group block"
      style={{ animation: `card-appear 0.45s ease both`, animationDelay: `${index * 70}ms` }}
    >
      <div className="glass-card overflow-hidden glass-hover h-full flex flex-col">
        {/* Banner + Avatar bridge */}
        <div className="relative flex-shrink-0">
          <div
            className="relative overflow-hidden"
            style={{ height: '180px', background: banner, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)' }} />
            {shop.defaultPickupAddress && (
              <span
                className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-semibold text-white/90"
                style={{ zIndex: 2, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: '8px', padding: '5px 10px' }}
              >
                <MapPin style={{ width: 12, height: 12 }} />
                {shop.defaultPickupAddress.city}, {shop.defaultPickupAddress.state}
              </span>
            )}
          </div>

          <div
            className="absolute glass flex items-center justify-center overflow-hidden"
            style={{
              bottom: 0, left: '24px', transform: 'translateY(50%)',
              width: '56px', height: '56px',
              borderRadius: '14px',
              border: '3px solid #000',
              background: 'rgba(255,255,255,0.08)',
              zIndex: 2,
            }}
          >
            {shop.logoUrl
              ? <img src={shop.logoUrl} alt={shop.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Store style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.5)' }} />
            }
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 px-6 pb-6 pt-8" style={{ zIndex: 1 }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }} className="group-hover:opacity-70 transition-opacity line-clamp-1">
            {shop.name}
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.42)', marginTop: '8px', lineHeight: 1.6 }} className="line-clamp-2 flex-1">
            {shop.description || 'Premium local craft maker.'}
          </p>
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)' }} className="flex items-center gap-1 group-hover:text-white transition-colors">
              Browse shop <ChevronRight style={{ width: 13, height: 13 }} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const { data: session } = useSession();
  const { shops, isLoading: shopsLoading } = useShopList();
  const { homepageSections, branding, isLoading: isBrandingLoading } = useSiteLayout();
  const marketplaceName = branding?.name || branding?.marketplaceName || 'AtlasBasket';

  const { data: categoriesData } = useQuery<any>({
    queryKey: ['home-categories'],
    queryFn: async () => (await axiosInstance.get('/api/categories/allowed')).data,
    staleTime: 5 * 60_000,
  });
  const homeCategories = categoriesData?.categories || [];

  const renderSection = (sectionId: string) => {
    const key = sectionId.toLowerCase();
    if (key.includes('hero')) {
      return (
        <section
          key={sectionId}
          className="relative overflow-hidden bg-[#080808] flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10 min-h-[calc(100dvh-5rem)] sm:min-h-[calc(100dvh-6rem)]"
        >
          {/* Grid lines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
              backgroundSize: '80px 80px',
            }}
          />
          {/* White glow blob top */}
          <div
            className="orb-1 absolute top-[-150px] sm:top-[-200px] left-1/2 -translate-x-1/2 w-[320px] xs:w-[500px] sm:w-[900px] h-[300px] sm:h-[600px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.06) 0%, transparent 70%)',
            }}
          />

          <div className="max-w-[900px] w-full text-center relative z-10 animate-fade-up">

            <div>
              {/* Eyebrow badge */}
              <div className="inline-flex max-w-full items-center gap-2 px-2.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white/[0.06] border border-white/10 text-[10px] sm:text-xs font-bold tracking-[0.02em] sm:tracking-widest text-white/65 uppercase mb-6 sm:mb-10">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block animate-pulse" />
                {branding.heroBadge || DEFAULT_BRANDING.heroBadge}
              </div>

              {/* Headline — Responsive */}
              <h1 className="text-[clamp(2.625rem,12vw,3rem)] max-[340px]:text-[2.375rem] max-[340px]:leading-[0.98] sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.98] tracking-tight text-white mb-0 sm:mb-8">
                {branding.heroHeadingLine1 || DEFAULT_BRANDING.heroHeadingLine1}<br />
                <span
                  className="bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent"
                >
                  {branding.heroHeadingLine2 || DEFAULT_BRANDING.heroHeadingLine2}
                </span><br />
                {branding.heroHeadingLine3 || DEFAULT_BRANDING.heroHeadingLine3}
              </h1>
            </div>

            {/* Subheading */}
            <p className="mt-6 text-sm sm:text-base md:text-lg text-white/55 max-w-[22rem] sm:max-w-[560px] mx-auto leading-[1.5] max-[340px]:leading-[1.4] sm:leading-relaxed font-normal sm:mt-0 sm:mb-12">
              {branding.heroDescription || DEFAULT_BRANDING.heroDescription}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center items-center w-full sm:mt-0">
              <Link href="/shops" className="w-[min(13.5rem,calc(100vw-2rem))] sm:w-auto">
                <button
                  className="w-full sm:w-auto h-11 sm:h-14 px-4 sm:px-8 rounded-xl bg-white text-black font-bold sm:font-extrabold text-[13px] sm:text-base cursor-pointer flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {branding.exploreShopsButtonText || DEFAULT_BRANDING.exploreShopsButtonText} <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </Link>
              <Link href="/products" className="w-[min(13.5rem,calc(100vw-2rem))] sm:w-auto">
                <button
                  className="w-full sm:w-auto h-11 sm:h-14 px-4 sm:px-8 rounded-xl bg-transparent text-white/85 border border-white/20 font-bold text-[13px] sm:text-base cursor-pointer transition-all hover:bg-white/10 hover:border-white/40 hover:text-white"
                >
                  {branding.browseProductsButtonText || DEFAULT_BRANDING.browseProductsButtonText}
                </button>
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (key.includes('categories') || key.includes('featured-products')) {
      return (
        <section key={sectionId} className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {/* Header */}
          <div className="flex items-end justify-between mb-6 sm:mb-8">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Browse by</p>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Categories</h2>
            </div>
            <Link href="/categories">
              <span className="text-xs sm:text-sm font-bold text-white/35 flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                View all <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {homeCategories.slice(0, 12).map((cat: any) => (
              <Link key={cat.id} href={`/products?category=${cat.id}`} className="group block w-[calc(50%-6px)] sm:w-[calc(33.333%-11px)] md:w-[calc(25%-12px)] lg:w-[calc(20%-13px)] xl:w-[calc(16.667%-14px)]">
                <div
                  className="glass-card glass-hover p-4 sm:p-7 flex flex-col items-center text-center gap-3 sm:gap-4 h-full"
                >
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/[0.08] flex items-center justify-center overflow-hidden group-hover:bg-white group-hover:scale-110 transition-all duration-200"
                  >
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} loading="lazy" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                    ) : (
                      <Grid3X3 className="h-5 w-5 sm:h-6 sm:w-6 text-white/75 group-hover:text-black transition-colors" />
                    )}
                  </div>
                  <span
                    className="text-xs sm:text-sm font-extrabold text-white/80 leading-snug group-hover:text-white transition-colors line-clamp-2"
                  >
                    {cat.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      );
    }

    if (key.includes('shops') || key.includes('nearby') || key.includes('offers') || key.includes('creators')) {
      return (
        <section key={sectionId} className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Handpicked</p>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Featured Creators</h2>
            </div>
            <Link href="/shops">
              <span className="text-xs sm:text-sm font-bold text-white/35 flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                All Shops <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </Link>
          </div>

          {shopsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card overflow-hidden flex flex-col">
                  <div className="relative flex-shrink-0">
                    <Skeleton className="h-40 sm:h-44 rounded-none" />
                    <div className="absolute bottom-0 left-6 translate-y-1/2 z-10">
                      <Skeleton className="h-14 w-14 rounded-xl" />
                    </div>
                  </div>
                  <div className="p-6 pt-9 flex flex-col gap-2.5">
                    <Skeleton className="h-5 w-7/12" />
                    <Skeleton className="h-3.5 w-11/12" />
                    <Skeleton className="h-3.5 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : shops.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shops.slice(0, 6).map((shop, i) => (
                <ShopCard key={shop.id} shop={shop} index={i} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 sm:p-20 text-center">
              <Store className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-sm sm:text-base text-white/35">No shops available yet.</p>
            </div>
          )}
        </section>
      );
    }

    if (key.includes('custom') || key.includes('promotional') || key.includes('prints')) {
      return (
        <section key={sectionId} className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div
            className="glass-card p-6 sm:p-12 md:p-16 relative overflow-hidden"
          >
            {/* Grid bg */}
            <div className="absolute inset-0 pointer-events-none opacity-5" style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }} />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-12">
              <div className="max-w-[540px]">
                <p className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-widest mb-3">
                  Made Just for You
                </p>
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
                  Need Something<br />One-of-a-Kind?
                </h2>
                <p className="text-xs sm:text-sm text-white/45 leading-relaxed mb-6">
                  Commission anything custom — from 3D-printed parts to tailored clothing, bespoke artwork, or personalised gifts. Local makers, real results.
                </p>
                <div className="flex flex-wrap gap-4 sm:gap-6">
                  {['Verify designs', 'Local creators', 'Track production'].map(s => (
                    <span key={s} className="text-xs sm:text-sm text-white/45 font-semibold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/45 inline-block" />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <Link href="/custom-orders" className="w-full md:w-auto shrink-0">
                <button
                  className="w-full md:w-auto h-13 sm:h-15 px-8 rounded-xl bg-white text-black font-extrabold text-sm sm:text-base cursor-pointer flex items-center justify-center gap-3 transition-transform hover:-translate-y-0.5 hover:opacity-90"
                >
                  <Printer className="h-5 w-5" />
                  Start a Custom Order
                </button>
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (key.includes('value') || key.includes('testimonials')) {
      return (
        <section key={sectionId} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '100px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '48px' }}>
            {valueProps.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: '20px' }}>
                <div style={{
                  flexShrink: 0, width: '52px', height: '52px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.65)' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>{title}</h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.7 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if ((key.includes('guest') || key.includes('signup') || key.includes('flash')) && !session) {
      return (
        <section key={sectionId} style={{ background: '#ffffff' }}>
          <div style={{
            maxWidth: '1280px', margin: '0 auto',
            padding: 'clamp(60px, 10vw, 100px) 24px',
            display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'space-between', gap: '40px',
          }}>
            <div>
              <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#000', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
                Your neighbourhood.<br />Your marketplace.
              </h2>
              <p style={{ fontSize: '16px', color: 'rgba(0,0,0,0.5)', marginTop: '12px', maxWidth: '400px', lineHeight: 1.6 }}>
                Join {marketplaceName} free — browse local sellers, follow your favourite shops, and get anything delivered or picked up nearby.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flexShrink: 1, maxWidth: '100%' }}>
              <Link href="/signup" style={{ maxWidth: '100%' }}>
                <button
                  style={{
                    height: '48px', padding: '0 22px', borderRadius: '14px',
                    background: '#000', color: '#fff', border: 'none',
                    fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Create Account
                </button>
              </Link>
              <Link href="/login" style={{ maxWidth: '100%' }}>
                <button
                  style={{
                    height: '48px', padding: '0 22px', borderRadius: '14px',
                    background: 'transparent', color: '#000',
                    border: '1.5px solid rgba(0,0,0,0.2)',
                    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; }}
                >
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return null;
  };

  return (
    <div style={{ background: '#080808' }}>
      {homepageSections.map(sec => renderSection(sec.id))}
    </div>
  );
}
