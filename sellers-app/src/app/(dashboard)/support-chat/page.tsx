'use client';

import { SupportChatPage } from '@/features/support-chat/ui/SupportChatPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <SupportChatPage />
    </ProtectedRoute>
  );
}
