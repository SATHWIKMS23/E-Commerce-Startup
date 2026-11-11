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
  Gavel,
  AlertTriangle,
  ShieldCheck,
  Scale,
  XCircle,
  X
} from 'lucide-react';

export function EnforcementPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'WARNING' | 'STRIKE' | 'APPEALS'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [appealModalRecord, setAppealModalRecord] = useState<any | null>(null);
  const [appealStatement, setAppealStatement] = useState('');
  const [appealEvidence, setAppealEvidence] = useState('');

  const queryClient = useQueryClient();

  // Fetch enforcement history & strike status
  const { data: enforcementData, isLoading } = useQuery({
    queryKey: ['seller-enforcement-history'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/enforcement');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // Fetch appeals history
  const { data: appealsData } = useQuery({
    queryKey: ['seller-appeals-history'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/appeals');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // Appeal submission mutation
  const submitAppealMutation = useMutation({
    mutationFn: async () => {
      if (!appealModalRecord) return;
      const res = await axiosInstance.post('/seller/api/appeals', {
        strikeId: appealModalRecord.id,
        statement: appealStatement.trim(),
        evidenceUrls: appealEvidence ? [appealEvidence.trim()] : [],
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-enforcement-history'] });
      queryClient.invalidateQueries({ queryKey: ['seller-appeals-history'] });
      setAppealModalRecord(null);
      setAppealStatement('');
      setAppealEvidence('');
      alert('Appeal successfully registered. Your reference number has been issued.');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to submit appeal');
    },
  });

  const validStrikesCount = enforcementData?.validStrikesCount ?? 0;
  const isSuspended = enforcementData?.isSuspended ?? false;
  const history = enforcementData?.history ?? [];
  const appeals = appealsData?.appeals ?? [];

  const warnings = history.filter((r: any) => r.type === 'WARNING');
  const strikes = history.filter((r: any) => r.type === 'STRIKE');

  const filteredHistory =
    activeTab === 'ALL'
      ? history
      : activeTab === 'WARNING'
      ? warnings
      : strikes;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Gavel className="h-5 w-5 text-purple-400" />
              Compliance, Enforcement & Appeals
            </h1>
            <p className="text-xs text-white/50">
              Merchant account standing under marketplace Community Guidelines and Terms of Service.
            </p>
          </div>
        </div>

        {/* Account Standing Banner & Strike Meter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`p-4 border md:col-span-2 ${
            isSuspended
              ? 'border-red-500/30 bg-red-950/20'
              : validStrikesCount === 0
              ? 'border-emerald-500/20 bg-emerald-950/10'
              : 'border-amber-500/20 bg-amber-950/10'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {isSuspended ? (
                    <XCircle className="h-5 w-5 text-red-400" />
                  ) : validStrikesCount === 0 ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  )}
                  <h3 className="text-sm font-bold text-white">
                    {isSuspended
                      ? 'Account Privileges Restricted'
                      : validStrikesCount === 0
                      ? 'Account Standing: In Good Standing'
                      : 'Account Standing: Violation Noticed'}
                  </h3>
                </div>
                <p className="text-xs text-white/60 mt-1 max-w-lg">
                  {isSuspended
                    ? 'Your selling privileges have been suspended due to policy violations. You retain full access to submit appeals, communicate with support, and review past records.'
                    : 'Formal Community Guidelines strikes contribute toward account suspension (maximum 3 valid strikes). Warnings have no limit and do not count toward suspension.'}
                </p>
              </div>

              {/* 3-Strike Visual Indicator */}
              <div className="flex flex-col items-center sm:items-end shrink-0">
                <span className="text-[11px] font-bold text-white/50 mb-1.5 uppercase tracking-wider">
                  Qualifying Strikes
                </span>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((slot) => {
                    const filled = slot <= validStrikesCount;
                    return (
                      <div
                        key={slot}
                        className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs border transition-all ${
                          filled
                            ? 'bg-red-500/20 border-red-500/40 text-red-400 ring-2 ring-red-500/20'
                            : 'bg-white/5 border-white/10 text-white/30'
                        }`}
                      >
                        {slot}
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-white/40 mt-1.5">
                  {validStrikesCount} / 3 Strikes Issued
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-white/5 bg-white/[0.02] flex flex-col justify-between">
            <div>
              <p className="text-xs text-white/40">Total Warnings Received</p>
              <p className="text-2xl font-bold text-white mt-1">{warnings.length}</p>
              <p className="text-[10px] text-white/40 mt-1">
                Informational notices • 0 strike impact
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/60">
              <span>Active Appeals:</span>
              <span className="font-bold text-purple-400 font-mono">{appeals.length}</span>
            </div>
          </Card>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 border-b border-white/5 pb-2">
          {[
            { id: 'ALL', label: `All Enforcements (${history.length})` },
            { id: 'WARNING', label: `Warnings (${warnings.length})` },
            { id: 'STRIKE', label: `Strikes (${strikes.length})` },
            { id: 'APPEALS', label: `Appeals Registry (${appeals.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        {activeTab === 'APPEALS' ? (
          /* Appeals Registry Tab */
          <div className="space-y-3">
            {appeals.length === 0 ? (
              <Card className="p-8 text-center text-xs text-white/40 border-white/5">
                No appeals registered. If you receive an enforcement action, you can appeal it directly from its details.
              </Card>
            ) : (
              appeals.map((app: any) => (
                <Card key={app.id} className="p-4 border border-white/5 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-purple-400" />
                      <span className="font-mono text-xs font-bold text-white">{app.appealNumber}</span>
                    </div>
                    <Badge className={
                      app.status === 'OVERTURNED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : app.status === 'UPHELD'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }>
                      {app.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-white/80 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Seller Statement</span>
                    <p className="whitespace-pre-wrap">{app.statement}</p>
                  </div>

                  {app.decisionReason && (
                    <div className="text-xs bg-purple-950/20 border border-purple-500/20 p-3 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-bold text-purple-300 block">Reviewer Decision</span>
                      <p className="text-white/90">{app.decisionReason}</p>
                      <span className="text-[10px] text-white/40 block">
                        Decided at: {new Date(app.decidedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        ) : (
          /* Enforcement List Tab */
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))
            ) : filteredHistory.length === 0 ? (
              <Card className="p-8 text-center text-xs text-white/40 border-white/5">
                No enforcement records in this category. Your account maintains full compliance!
              </Card>
            ) : (
              filteredHistory.map((rec: any) => {
                const isStrike = rec.type === 'STRIKE';
                const hasAppealed = !!rec.appeals?.length || rec.status === 'UNDER_APPEAL';

                return (
                  <Card
                    key={rec.id}
                    className="p-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={
                            isStrike
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }>
                            {isStrike ? 'Formal Strike' : 'Warning'}
                          </Badge>
                          <span className="font-mono text-xs text-white/80 font-bold">{rec.strikeNumber}</span>
                          <span className="text-[11px] text-white/40">•</span>
                          <span className="text-[11px] text-white/40">
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-white/90">{rec.reason}</p>
                        {rec.guidelineClause && (
                          <p className="text-[11px] text-purple-400 font-medium">
                            Violated Clause: {rec.guidelineClause} (v{rec.guidelineVersion})
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRecord(rec)}
                          className="border-white/10 text-xs text-white/80"
                        >
                          View Details
                        </Button>

                        {!hasAppealed && rec.status !== 'OVERTURNED' && (
                          <Button
                            size="sm"
                            onClick={() => setAppealModalRecord(rec)}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold gap-1"
                          >
                            <Scale className="h-3.5 w-3.5" />
                            Appeal
                          </Button>
                        )}

                        {hasAppealed && (
                          <Badge className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px]">
                            Appeal Registered
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Enforcement Detail Modal / Drawer */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <Card className="max-w-lg w-full p-6 border-white/10 bg-[#0d0d14] space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">
                    {selectedRecord.type === 'STRIKE' ? 'Formal Violation Strike' : 'Advisory Warning'}
                  </h3>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="text-white/40 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-white/40">Record Reference:</span>
                    <span className="font-mono text-white font-bold">{selectedRecord.strikeNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Date Issued:</span>
                    <span className="text-white">{new Date(selectedRecord.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Status:</span>
                    <span className="text-purple-400 font-bold">{selectedRecord.status}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Reason for Enforcement</span>
                  <p className="p-3 rounded-lg bg-white/[0.03] text-white/90">{selectedRecord.reason}</p>
                </div>

                {selectedRecord.detailedNotes && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Detailed Findings</span>
                    <p className="p-3 rounded-lg bg-white/[0.03] text-white/80 whitespace-pre-wrap">{selectedRecord.detailedNotes}</p>
                  </div>
                )}

                {selectedRecord.guidelineClause && (
                  <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/20">
                    <span className="text-[10px] uppercase font-bold text-purple-300 block mb-1">Community Guidelines Clause</span>
                    <p className="text-white font-medium">{selectedRecord.guidelineClause} (Version: {selectedRecord.guidelineVersion})</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-white/10">
                <Button size="sm" variant="outline" onClick={() => setSelectedRecord(null)} className="border-white/10 text-xs">
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Submit Appeal Modal */}
        {appealModalRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <Card className="max-w-lg w-full p-6 border-white/10 bg-[#0d0d14] space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">Submit Formal Appeal</h3>
                </div>
                <button onClick={() => setAppealModalRecord(null)} className="text-white/40 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-white/60">
                  Appealing enforcement record <span className="font-mono text-purple-300 font-bold">{appealModalRecord.strikeNumber}</span>. Please state the grounds for your appeal clearly.
                </p>

                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">
                    Seller Statement / Explanation *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide your factual rebuttal, context, and corrective measures taken..."
                    value={appealStatement}
                    onChange={(e) => setAppealStatement(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">
                    Evidence URL / Cloud Attachment Link (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={appealEvidence}
                    onChange={(e) => setAppealEvidence(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <Button size="sm" variant="outline" onClick={() => setAppealModalRecord(null)} className="border-white/10 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!appealStatement.trim() || submitAppealMutation.isPending}
                  onClick={() => submitAppealMutation.mutate()}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  {submitAppealMutation.isPending ? 'Submitting...' : 'Submit Appeal to Reviewers'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
