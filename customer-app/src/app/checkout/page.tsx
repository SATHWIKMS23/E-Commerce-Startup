import { CheckoutPage } from '@/features/checkout/ui/CheckoutPage';
import { Suspense } from 'react';

export default function CheckoutRoute() {
  return (
    <main className="py-6 bg-zinc-950/20 min-h-[calc(100dvh-64px)]">
      <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-8 text-muted-foreground">Loading checkout details...</div>}>
        <CheckoutPage />
      </Suspense>
    </main>
  );
}
