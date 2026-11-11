'use client';

import { OrdersPage } from '@/features/orders/ui/OrdersPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { ShopRequiredRoute } from '@/components/guards/ShopRequiredRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <ShopRequiredRoute>
        <OrdersPage />
      </ShopRequiredRoute>
    </ProtectedRoute>
  );
}
