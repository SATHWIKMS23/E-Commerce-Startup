'use client';

import { RegisterPage } from '@/features/auth/ui/RegisterPage';
import { GuestRoute } from '@/components/guards/GuestRoute';

export default function Page() {
  return (
    <GuestRoute>
      <RegisterPage />
    </GuestRoute>
  );
}
