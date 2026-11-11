'use client';

import { SettingsPage } from '@/features/settings/ui/SettingsPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  );
}
