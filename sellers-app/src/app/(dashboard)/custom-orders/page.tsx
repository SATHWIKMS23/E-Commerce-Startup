'use client';

import { CustomOrdersPage } from '@/features/custom-orders/ui/CustomOrdersPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { ShopRequiredRoute } from '@/components/guards/ShopRequiredRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <ShopRequiredRoute>
        <CustomOrdersPage />
      </ShopRequiredRoute>
    </ProtectedRoute>
  );
}
