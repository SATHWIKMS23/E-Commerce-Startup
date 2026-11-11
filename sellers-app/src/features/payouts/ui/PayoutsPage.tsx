'use client';

import { useState } from 'react';
import { usePayouts } from '../hooks/usePayouts';
import { productService } from '@/features/products/services/productService';
import { ordersService } from '@/features/orders/services/ordersService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Skeleton } from '@/shared/components/Skeleton';
import { IndianRupee, CheckCircle2, Clock, Landmark } from 'lucide-react';

export function PayoutsPage() {
  const { payouts, pendingPayouts, completedPayouts, summary, isLoadingSummary } = usePayouts();
  const [tab, setTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const displayedPayouts =
    tab === 'ALL' ? payouts : tab === 'PENDING' ? pendingPayouts : completedPayouts;

  const cards = [
    {
      name: 'Gross Lifetime Revenue',
      value: productService.formatPrice(summary?.totalEarnings ?? 0),
      icon: IndianRupee,
      color: 'text-purple-400',
    },
    {
      name: 'Total Settled Settlements',
      value: productService.formatPrice(summary?.totalPaid ?? 0),
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      name: 'Pending Balance',
      value: productService.formatPrice(summary?.totalPending ?? 0),
      icon: Clock,
      color: 'text-indigo-400',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Settlements & Payouts</h1>
          <p className="text-xs text-white/45">Monitor your store earnings, check pending settlements, and review payout logs.</p>
        </div>

        {/* Cards summary */}
        {isLoadingSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <Card key={i} className="border border-white/5 bg-white/[0.01]">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-bold text-white/45 uppercase tracking-widest">
                      {card.name}
                    </CardTitle>
                    <Icon className={`h-4.5 w-4.5 ${card.color}`} />
                  </CardHeader>
                  <CardContent>
                    <span className="text-xl font-extrabold text-white/90 tracking-tight">{card.value}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tab logs */}
        <Card className="border border-white/5 overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-bold text-white/90">Payout History</CardTitle>
              <CardDescription>Details of all direct deposit bank settlements</CardDescription>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['ALL', 'PENDING', 'COMPLETED'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`h-8 px-3 rounded-lg text-[10px] uppercase font-extrabold tracking-wide cursor-pointer transition-all ${
                    tab === t
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                      : 'text-white/45 hover:text-white/80 hover:bg-white/[0.02]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {displayedPayouts.length > 0 ? (
              <>
                {/* ── MOBILE VIEW: PAYOUT CARDS (< md) ── */}
                <div className="block md:hidden p-4 space-y-3">
                  {displayedPayouts.map((pay) => (
                    <div key={pay.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-white/90 text-sm">
                          {productService.formatPrice(pay.amount)}
                        </span>
                        <Badge
                          variant={
                            pay.status === 'COMPLETED'
                              ? 'success'
                              : pay.status === 'PENDING' || pay.status === 'PROCESSING'
                              ? 'default'
                              : 'destructive'
                          }
                          className="text-[8px] py-0 px-2 font-bold uppercase"
                        >
                          {pay.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/50 pt-1 border-t border-white/5">
                        <span>Fulfillment Date:</span>
                        <span>{ordersService.formatDate(pay.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-white/40">
                        <span>Reference:</span>
                        <span>{pay.transactionRef || 'PR-N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── DESKTOP VIEW: TABLE (>= md) ── */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Fulfillment Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payout Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedPayouts.map((pay) => (
                        <TableRow key={pay.id}>
                          <TableCell className="font-bold text-white/90 text-xs">
                            {productService.formatPrice(pay.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-white/50">
                            {ordersService.formatDate(pay.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                pay.status === 'COMPLETED'
                                  ? 'success'
                                  : pay.status === 'PENDING' || pay.status === 'PROCESSING'
                                  ? 'default'
                                  : 'destructive'
                              }
                              className="text-[8px] py-0"
                            >
                              {pay.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-white/40">
                            {pay.transactionRef || 'PR-N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                  <Landmark className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-white/60">No payout records found</h4>
                <p className="text-[10px] text-white/35 max-w-xs mx-auto leading-relaxed">
                  Direct deposit payouts are initiated automatically upon delivery fulfillment. Link a valid bank account to prepare settlements.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
