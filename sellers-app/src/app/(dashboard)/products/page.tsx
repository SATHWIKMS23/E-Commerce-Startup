'use client';

import { ProductListPage } from '@/features/products/ui/ProductListPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { ShopRequiredRoute } from '@/components/guards/ShopRequiredRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <ShopRequiredRoute>
        <ProductListPage />
      </ShopRequiredRoute>
    </ProtectedRoute>
  );
}
