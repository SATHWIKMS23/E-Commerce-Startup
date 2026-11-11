'use client';

import { CommissionStatementsPage } from '@/features/commission/ui/CommissionStatementsPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <CommissionStatementsPage />
    </ProtectedRoute>
  );
}
