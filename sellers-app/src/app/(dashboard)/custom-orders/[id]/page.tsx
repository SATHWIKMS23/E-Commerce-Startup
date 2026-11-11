'use client';

import { CustomOrderDetailPage } from '@/features/custom-orders/ui/CustomOrderDetailPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { ShopRequiredRoute } from '@/components/guards/ShopRequiredRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <ShopRequiredRoute>
        <CustomOrderDetailPage />
      </ShopRequiredRoute>
    </ProtectedRoute>
  );
}
