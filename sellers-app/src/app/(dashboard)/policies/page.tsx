'use client';

import { PoliciesPage } from '@/features/policies/ui/PoliciesPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <PoliciesPage />
    </ProtectedRoute>
  );
}
