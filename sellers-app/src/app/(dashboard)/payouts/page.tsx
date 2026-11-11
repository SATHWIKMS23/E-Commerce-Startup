'use client';

import { PayoutsPage } from '@/features/payouts/ui/PayoutsPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { ShopRequiredRoute } from '@/components/guards/ShopRequiredRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <ShopRequiredRoute>
        <PayoutsPage />
      </ShopRequiredRoute>
    </ProtectedRoute>
  );
}
