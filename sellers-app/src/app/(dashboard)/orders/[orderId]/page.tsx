'use client';

import { OrderDetailPage } from '@/features/orders/ui/OrderDetailPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { ShopRequiredRoute } from '@/components/guards/ShopRequiredRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <ShopRequiredRoute>
        <OrderDetailPage />
      </ShopRequiredRoute>
    </ProtectedRoute>
  );
}
