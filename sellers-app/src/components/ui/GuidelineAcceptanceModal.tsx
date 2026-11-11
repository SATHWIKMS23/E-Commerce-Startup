'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { ShieldAlert, ShieldCheck, Download } from 'lucide-react';

export function GuidelineAcceptanceModal() {
  const [agreed, setAgreed] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [completedProof, setCompletedProof] = useState<any | null>(null);

  const queryClient = useQueryClient();

  // Query if there is an active guideline needing acceptance
  const { data } = useQuery({
    queryKey: ['seller-guideline-pending'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/guidelines/pending');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!data?.guideline?.id || !signedName.trim()) return;
      const res = await axiosInstance.post(`/seller/api/guidelines/${data.guideline.id}/accept`, {
        signedName: signedName.trim(),
      });
      return res.data;
    },
    onSuccess: (resData) => {
      setCompletedProof(resData?.agreement);
      queryClient.invalidateQueries({ queryKey: ['seller-guideline-pending'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to record acceptance.');
    },
  });

  if (!data?.requiresAcceptance || !data?.guideline) {
    return null;
  }

  const guideline = data.guideline;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <Card className="max-w-2xl w-full p-6 border-purple-500/30 bg-[#0a0a10] shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {completedProof ? (
          /* Confirmation & Download Receipt Screen */
          <div className="space-y-4 text-center py-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Community Guidelines Terms Accepted</h3>
            <p className="text-xs text-white/60 max-w-md mx-auto">
              Your cryptographic agreement for Version <span className="text-emerald-400 font-bold">{guideline.version}</span> has been timestamped and permanently registered.
            </p>

            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5 text-left text-xs font-mono space-y-1">
              <div>Certificate ID: <span className="text-white">{completedProof.id}</span></div>
              <div>Signer: <span className="text-white">{completedProof.signedName}</span></div>
              <div>SHA-256 Digest: <span className="text-purple-300 break-all">{completedProof.documentHash || guideline.contentHash}</span></div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(completedProof, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `guidelines_proof_${guideline.version}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="border-white/10 text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Download Cryptographic Proof
              </Button>
              <Button
                size="sm"
                onClick={() => setCompletedProof(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Continue to Portal
              </Button>
            </div>
          </div>
        ) : (
          /* Review & Acceptance Form */
          <>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-purple-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">Community Guidelines Acceptance Required</h3>
                  <p className="text-[11px] text-white/50">
                    Version {guideline.version} • Published terms must be reviewed and accepted.
                  </p>
                </div>
              </div>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
                v{guideline.version}
              </Badge>
            </div>

            {/* Scrollable Terms & Clauses */}
            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-white/80 p-4 bg-white/[0.02] rounded-xl border border-white/5 max-h-[50vh]">
              <div className="border-b border-white/5 pb-2">
                <h4 className="font-bold text-sm text-white">{guideline.title}</h4>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Effective Date: {new Date(guideline.effectiveDate || guideline.publishedAt).toLocaleDateString()}
                </p>
              </div>

              {Array.isArray(guideline.sections) && guideline.sections.map((sec: any, idx: number) => (
                <div key={idx} className="space-y-1.5">
                  <h5 className="font-bold text-white text-xs">
                    {sec.heading || `Section ${idx + 1}`}
                  </h5>
                  <p className="text-white/70 whitespace-pre-wrap leading-relaxed">{sec.content}</p>
                  {Array.isArray(sec.clauses) && sec.clauses.map((clause: any, cIdx: number) => (
                    <div key={cIdx} className="pl-3 border-l border-purple-500/30 py-0.5 text-white/80">
                      <span className="font-mono text-[10px] text-purple-400 font-bold mr-1.5">
                        {clause.identifier || `Clause ${cIdx + 1}`}:
                      </span>
                      <span>{clause.text || clause.content}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Acceptance Signature Inputs */}
            <div className="space-y-3 pt-2 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-purple-600 focus:ring-0 mt-0.5"
                />
                <span className="text-white/80 text-[11px] leading-relaxed">
                  I confirm that I am an authorized representative of this seller account, have read and understood the marketplace Community Guidelines (Version {guideline.version}), and agree to be bound by these published terms.
                </span>
              </label>

              <div>
                <label className="text-[11px] font-semibold text-white/90 block mb-1">
                  Type Full Legal Name (Signatory Verification) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Johnathan Doe"
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <Button
                size="sm"
                disabled={!agreed || !signedName.trim() || acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40"
              >
                {acceptMutation.isPending ? 'Cryptographically Signing...' : 'Accept & Record Agreement'}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
