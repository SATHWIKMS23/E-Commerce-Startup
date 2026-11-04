import { Suspense } from 'react';
import { Footer } from '@/shared/components/Footer';
import { CategoriesPage } from '@/features/categories/ui/CategoriesPage';

export default function CategoriesRoute() {
  return (
    <main className="bg-zinc-950/20 min-h-[calc(100dvh-64px)] flex flex-col justify-between">
      <div className="flex-1">
        <Suspense fallback={
          <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
            Loading categories...
          </div>
        }>
          <CategoriesPage />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
