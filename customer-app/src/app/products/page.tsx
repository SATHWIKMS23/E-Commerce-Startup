import { Suspense } from 'react';
import { Footer } from '@/shared/components/Footer';
import { ProductListPage } from '@/features/products/product-list/ui/ProductListPage';

export default function ProductsPage() {
  return (
    <main className="bg-zinc-950/20 min-h-[calc(100dvh-64px)] flex flex-col justify-between">
      <div className="flex-1 py-6">
        <Suspense fallback={
          <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
            Loading products...
          </div>
        }>
          <ProductListPage />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
