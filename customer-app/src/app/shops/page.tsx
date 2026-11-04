import { Footer } from '@/shared/components/Footer';
import { ShopListPage } from '@/features/shops/shop-list/ui/ShopListPage';

export const metadata = {
  title: 'Local Craft Shops',
  description: 'Find local artisans, craft makers, and 3D printing vendors near you.',
};

export default function ShopsRoutePage() {
  return (
    <main className="bg-zinc-950/20 min-h-[calc(100dvh-64px)] flex flex-col justify-between">
      <div className="flex-1">
        <ShopListPage />
      </div>
      <Footer />
    </main>
  );
}
