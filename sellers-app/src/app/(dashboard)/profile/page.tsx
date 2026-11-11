'use client';

import { SellerProfilePage } from '@/features/profile/ui/SellerProfilePage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <SellerProfilePage />
    </ProtectedRoute>
  );
}
