'use client';

import { Suspense } from 'react';
import { LoginPage } from '@/features/auth/ui/LoginPage';
import { GuestRoute } from '@/components/guards/GuestRoute';

export default function Page() {
  return (
    <GuestRoute>
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    </GuestRoute>
  );
}
