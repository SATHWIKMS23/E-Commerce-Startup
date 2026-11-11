'use client';

import { AnalyticsPage } from '@/features/analytics/ui/AnalyticsPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { ShopRequiredRoute } from '@/components/guards/ShopRequiredRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <ShopRequiredRoute>
        <AnalyticsPage />
      </ShopRequiredRoute>
    </ProtectedRoute>
  );
}
