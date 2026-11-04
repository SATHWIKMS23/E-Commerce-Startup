import { OrderHistoryPage } from '@/features/orders/ui/OrderHistoryPage';

export default function OrdersRoute() {
  return (
    <main className="py-6 bg-zinc-950/20 min-h-[calc(100dvh-64px)]">
      <OrderHistoryPage />
    </main>
  );
}
