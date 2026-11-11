'use client';

import { EnforcementPage } from '@/features/enforcement/ui/EnforcementPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <EnforcementPage />
    </ProtectedRoute>
  );
}
