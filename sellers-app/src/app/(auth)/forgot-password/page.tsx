'use client';

import { ForgotPasswordPage } from '@/features/auth/ui/ForgotPasswordPage';
import { GuestRoute } from '@/components/guards/GuestRoute';

export default function Page() {
  return (
    <GuestRoute>
      <ForgotPasswordPage />
    </GuestRoute>
  );
}
