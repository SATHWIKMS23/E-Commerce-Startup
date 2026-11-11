'use client';

import { ReviewsPage } from '@/features/reviews/ui/ReviewsPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { ShopRequiredRoute } from '@/components/guards/ShopRequiredRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <ShopRequiredRoute>
        <ReviewsPage />
      </ShopRequiredRoute>
    </ProtectedRoute>
  );
}
