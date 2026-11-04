"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { MessageSquare, AlertTriangle } from 'lucide-react';
import { ReportIssueModal } from './ReportIssueModal';

export function FloatingSupportWidget() {
  const [showReportModal, setShowReportModal] = useState(false);
  const { data: session } = useSession();

  const { data: convData } = useQuery<{ conversations?: Array<{ unreadCount?: number }> }>({
    queryKey: ['customer-conversations'],
    queryFn: async () => (await axiosInstance.get('/customer/api/conversations')).data,
    enabled: !!session,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const totalUnreadCount = convData?.conversations?.reduce(
    (total, conv) => total + (conv.unreadCount || 0),
    0
  ) || 0;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <button
          onClick={() => setShowReportModal(true)}
          className="h-10 px-3.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl transition-all"
          title="Report an issue or fraudulent merchant"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Report Issue</span>
        </button>

        <Link
          href="/support-chat"
          className="relative h-11 px-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-2xl shadow-indigo-950/60 transition-all hover:scale-105"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Support Desk</span>
          {totalUnreadCount > 0 && (
            <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white animate-pulse">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </Link>
      </div>

      <ReportIssueModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </>
  );
}
