'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  FileSpreadsheet,
  Download,
  Eye,
  X,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';

export function CommissionStatementsPage() {
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  // Load published commission statements for this seller
  const { data, isLoading } = useQuery({
    queryKey: ['seller-commission-statements'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/commission-statements');
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  // Load detail for selected statement
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['seller-commission-statement-detail', selectedStatementId],
    queryFn: async () => {
      if (!selectedStatementId) return null;
      const res = await axiosInstance.get(`/seller/api/commission-statements/${selectedStatementId}`);
      return res.data;
    },
    enabled: !!selectedStatementId,
  });

  const statements = data?.statements ?? [];
  const currentStatement = detailData?.statement;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
              Monthly Commission Statements & Settlements
            </h1>
            <p className="text-xs text-white/50">
              Audited monthly commission settlement invoices, order summaries, and payment receipts.
            </p>
          </div>
          <Link href="/support-chat">
            <Button size="sm" variant="outline" className="border-white/10 text-xs text-white/80 gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              Dispute / Clarify Statement
            </Button>
          </Link>
        </div>

        {/* Statements Table */}
        <Card className="border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-white/40 border-b border-white/5">
                <tr>
                  <th className="p-3.5">Statement # &amp; Month</th>
                  <th className="p-3.5">Eligible Orders</th>
                  <th className="p-3.5">Accrued Commission</th>
                  <th className="p-3.5">Payments Received</th>
                  <th className="p-3.5">Outstanding Balance</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="p-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : statements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-white/40">
                      No published commission statements available yet.
                    </td>
                  </tr>
                ) : (
                  statements.map((s: any) => {
                    const balance = Number(s.outstandingBalance || 0);
                    return (
                      <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-white block">{s.statementNumber}</span>
                          <span className="text-[11px] text-emerald-400 font-semibold">{s.periodMonth}</span>
                        </td>
                        <td className="p-3.5">{s.eligibleOrdersCount} orders</td>
                        <td className="p-3.5 font-mono">INR {Number(s.commissionAccrued).toFixed(2)}</td>
                        <td className="p-3.5 font-mono text-emerald-400">INR {Number(s.paymentsReceived).toFixed(2)}</td>
                        <td className="p-3.5 font-mono font-bold">
                          <span className={balance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            INR {balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20 text-[10px]">
                            {s.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedStatementId(s.id)}
                            className="border-white/10 text-xs text-white/90 gap-1"
                          >
                            <Eye className="h-3 w-3" /> View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Statement Detail Drawer / Modal */}
        {selectedStatementId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <Card className="max-w-xl w-full p-6 border-white/10 bg-[#0d0d14] space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-white">Commission Statement Details</h3>
                  <span className="font-mono text-xs text-emerald-400">
                    {currentStatement?.statementNumber}
                  </span>
                </div>
                <button onClick={() => setSelectedStatementId(null)} className="text-white/40 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isDetailLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : currentStatement ? (
                <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
                  <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/40">Statement Period:</span>
                      <span className="text-white font-medium">
                        {new Date(currentStatement.startDate).toLocaleDateString()} – {new Date(currentStatement.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Commissionable Base:</span>
                      <span className="font-mono text-white">INR {Number(currentStatement.commissionableBase).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Applicable Commission Rate:</span>
                      <span className="font-mono text-white">{currentStatement.applicableRate}%</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-2">
                      <span className="text-white/60 font-semibold">Total Accrued Commission:</span>
                      <span className="font-mono text-white font-bold">INR {Number(currentStatement.commissionAccrued).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60 font-semibold">Confirmed Remittances:</span>
                      <span className="font-mono text-emerald-400 font-bold">INR {Number(currentStatement.paymentsReceived).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-2">
                      <span className="text-white/60 font-bold">Outstanding Balance Due:</span>
                      <span className="font-mono text-amber-400 font-extrabold text-sm">
                        INR {Number(currentStatement.outstandingBalance).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment history */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                      Recorded Payment Remittances ({currentStatement.payments?.length ?? 0})
                    </h4>
                    {currentStatement.payments?.length === 0 ? (
                      <p className="text-white/40 p-3 bg-white/[0.02] rounded-lg">No payment remittances recorded yet for this period.</p>
                    ) : (
                      currentStatement.payments?.map((pmt: any) => (
                        <div key={pmt.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/5 flex justify-between items-center">
                          <div>
                            <span className="font-mono font-bold text-emerald-400">INR {Number(pmt.amount).toFixed(2)}</span>
                            <span className="text-[10px] text-white/40 block">{pmt.paymentMethod} • Ref: {pmt.transactionReference || 'N/A'}</span>
                          </div>
                          <span className="text-[10px] text-white/40">{new Date(pmt.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-between items-center pt-3 border-t border-white/10 text-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!currentStatement) return;
                    const blob = new Blob([JSON.stringify(currentStatement, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `statement_${currentStatement.statementNumber}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="border-white/10 text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Download Statement Proof
                </Button>

                <Button size="sm" onClick={() => setSelectedStatementId(null)} className="border-white/10 text-xs">
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
