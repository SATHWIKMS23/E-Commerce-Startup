'use client';

import { ShopSettingsPage } from '@/features/shop/ui/ShopSettingsPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { ShopRequiredRoute } from '@/components/guards/ShopRequiredRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <ShopRequiredRoute>
        <ShopSettingsPage />
      </ShopRequiredRoute>
    </ProtectedRoute>
  );
}
