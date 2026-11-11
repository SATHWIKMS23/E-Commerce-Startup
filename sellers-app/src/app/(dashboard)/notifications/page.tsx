'use client';

import { NotificationsPage } from '@/features/notifications/ui/NotificationsPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { ShopRequiredRoute } from '@/components/guards/ShopRequiredRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <ShopRequiredRoute>
        <NotificationsPage />
      </ShopRequiredRoute>
    </ProtectedRoute>
  );
}
