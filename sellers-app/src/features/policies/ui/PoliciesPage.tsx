'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  FileText,
  Search,
  CheckCircle2,
  Eye,
  X,
  BellRing
} from 'lucide-react';

export function PoliciesPage() {
  const [search, setSearch] = useState('');
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  const queryClient = useQueryClient();

  // Load published policy notices
  const { data, isLoading } = useQuery({
    queryKey: ['seller-policy-notices'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/policy-notices');
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post(`/seller/api/policy-notices/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-policy-notices'] });
    },
  });

  const notices = data?.notices ?? [];
  const filteredNotices = notices.filter((n: any) =>
    search ? n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()) : true
  );

  const handleOpenNotice = (notice: any) => {
    setSelectedNotice(notice);
    if (!notice.hasRead) {
      markAsReadMutation.mutate(notice.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              Marketplace Operational Policies & Bulletins
            </h1>
            <p className="text-xs text-white/50">
              Official marketplace operating policies, dispatch requirements, packaging standards, and compliance rules.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search policy notices, operational guidelines, packaging requirements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Notices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : filteredNotices.length === 0 ? (
            <div className="md:col-span-2 p-12 text-center text-xs text-white/40">
              No operational policy bulletins published yet.
            </div>
          ) : (
            filteredNotices.map((n: any) => {
              return (
                <Card
                  key={n.id}
                  onClick={() => handleOpenNotice(n)}
                  className="p-5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/20 text-[10px]">
                        {n.category || 'OPERATIONAL'}
                      </Badge>
                      {n.hasRead ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Read
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                          <BellRing className="h-3 w-3" /> New
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                      {n.title}
                    </h3>

                    <p className="text-xs text-white/50 line-clamp-2">
                      {n.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/40 pt-2 border-t border-white/5">
                    <span>Effective: {new Date(n.effectiveDate || n.publishedAt).toLocaleDateString()}</span>
                    <span className="text-indigo-400 font-semibold group-hover:underline flex items-center gap-1">
                      Read Bulletin <Eye className="h-3 w-3" />
                    </span>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Notice Full Content Modal */}
        {selectedNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <Card className="max-w-xl w-full p-6 border-white/10 bg-[#0d0d14] space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="space-y-1">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                    {selectedNotice.category || 'OPERATIONAL'}
                  </Badge>
                  <h3 className="font-bold text-base text-white">{selectedNotice.title}</h3>
                </div>
                <button onClick={() => setSelectedNotice(null)} className="text-white/40 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 text-xs text-white/80 pr-1">
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/5 text-[11px] text-white/50 flex justify-between">
                  <span>Published: {new Date(selectedNotice.publishedAt).toLocaleDateString()}</span>
                  <span>Effective Date: {new Date(selectedNotice.effectiveDate || selectedNotice.publishedAt).toLocaleDateString()}</span>
                </div>

                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed text-sm text-white/90">
                  {selectedNotice.content}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Acknowledged & Logged
                </span>
                <Button size="sm" onClick={() => setSelectedNotice(null)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  Done
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
