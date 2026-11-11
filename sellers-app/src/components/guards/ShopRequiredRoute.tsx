'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShop } from '@/features/shop/hooks/useShop';

export function ShopRequiredRoute({ children }: { children: React.ReactNode }) {
  const { hasShop, isLoadingShop } = useShop();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingShop && !hasShop) {
      router.replace('/shop-setup');
    }
  }, [hasShop, isLoadingShop, router]);

  if (isLoadingShop) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8 space-y-4">
        <span className="h-10 w-10 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
        <p className="text-sm text-white/40 font-medium font-sans">Checking shop configurations...</p>
      </div>
    );
  }

  if (!hasShop) {
    return null;
  }

  return <>{children}</>;
}
