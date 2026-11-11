'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCustomOrders } from '../hooks/useCustomOrders';
import { customOrderService } from '../services/customOrderService';
import type { QuotationInput } from '../services/customOrderService';
import { ordersService } from '@/features/orders/services/ordersService';
import { productService } from '@/features/products/services/productService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUIStore } from '@/lib/store/uiStore';
import { quotationSchema } from '../services/customOrderService';
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  Clock,
  FileCode,
  Download,
  Trash2,
  IndianRupee,
} from 'lucide-react';

import { useConfirmStore } from '@/lib/store/confirmStore';

export function CustomOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const {
    customOrder,
    isLoadingDetails,
    acceptOrder,
    isAccepting,
    rejectOrder,
    isRejecting,
    sendQuotation,
    isSendingQuote,
    updateQuotation,
    isUpdatingQuote,
    deleteQuotation,
  } = useCustomOrders(id);

  // States
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [isEditQuote, setIsEditQuote] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register: quoteRegister,
    handleSubmit: quoteSubmit,
    setValue: quoteSetValue,
    reset: quoteReset,
    formState: { errors: quoteErrors },
  } = useForm<QuotationInput>({
    resolver: zodResolver(quotationSchema),
  });

  if (isLoadingDetails) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!customOrder) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 space-y-3">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500/50" />
          <h3 className="text-base font-bold text-white/80">Request Ticket Not Found</h3>
          <Button variant="outline" size="sm" onClick={() => router.push('/custom-orders')}>
            Back to Requests
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Active Quote from this seller (cuntomorderController filters quotes to only show this seller's quotes)
  const activeQuote = customOrder.quotes?.[0] || null;
  const showToast = useUIStore((state) => state.showToast);

  const handleAcceptReview = async () => {
    setFormError(null);
    try {
      await acceptOrder(customOrder.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to accept order.');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setFormError(null);
    try {
      await rejectOrder({ id: customOrder.id, reason: rejectReason });
      setRejectOpen(false);
      setRejectReason('');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject request.');
    }
  };

  const onQuoteSubmit = async (data: QuotationInput) => {
    setFormError(null);
    try {
      if (isEditQuote) {
        await updateQuotation({
          id: customOrder.id,
          payload: data,
        });
      } else {
        await sendQuotation({
          id: customOrder.id,
          payload: data,
        });
      }
      setQuoteOpen(false);
      quoteReset();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit quote.');
    }
  };

  const handleRecallQuote = () => {
    showConfirm({
      title: 'Recall Quotation Offer',
      message: 'Are you sure you want to recall/delete your quotation for this custom request?',
      confirmText: 'Recall Quote',
      onConfirm: async () => {
        try {
          await deleteQuotation(customOrder.id);
        } catch (err: any) {
          showToast(err.message || 'Failed to recall quotation.');
        }
      },
    });
  };

  const fileIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'STL':
      case 'STEP':
      case 'OBJ':
        return <FileCode className="h-5 w-5 text-purple-400 shrink-0" />;
      default:
        return <FileText className="h-5 w-5 text-indigo-400 shrink-0" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl animate-fade-up">
        {/* Back Link */}
        <button
          onClick={() => router.push('/custom-orders')}
          className="inline-flex items-center text-xs font-semibold text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          <span>Back to Request Tickets</span>
        </button>

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white/95">{customOrder.title}</h1>
              <Badge variant={customOrderService.getStatusBadgeVariant(customOrder.status)}>
                {customOrder.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-[11px] text-white/35">Ticket: {customOrder.orderNumber}</p>
          </div>

          {/* Action triggers */}
          <div className="flex flex-wrap items-center gap-2.5">
            {customOrder.status === 'SUBMITTED' && (
              <>
                <Button onClick={handleAcceptReview} isLoading={isAccepting} size="sm">
                  Accept for Review
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRejectOpen(true)}
                  disabled={isAccepting}
                >
                  Decline Request
                </Button>
              </>
            )}

            {customOrder.status === 'UNDER_REVIEW' && !activeQuote && (
              <Button
                onClick={() => {
                  setIsEditQuote(false);
                  quoteReset();
                  setQuoteOpen(true);
                }}
                size="sm"
              >
                Submit Price Quotation
              </Button>
            )}
          </div>
        </div>

        {/* Grid layout details */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* General Specs */}
            <Card className="border border-white/5">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-bold block">Request Requirements</span>
                  <p className="text-xs text-white/80 leading-relaxed mt-1 whitespace-pre-line font-medium">
                    {customOrder.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-bold block">Preferred Material</span>
                    <span className="text-xs font-bold text-white/95 mt-0.5 block">
                      {customOrder.material || 'Unspecified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-bold block">Required Quantity</span>
                    <span className="text-xs font-bold text-white/95 mt-0.5 block">
                      {customOrder.quantity} units
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attachment files */}
            <Card className="border border-white/5">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-xs font-bold text-white/90">Design File Attachments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {customOrder.files?.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {customOrder.files.map((file) => (
                      <div key={file.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {fileIcon(file.fileType)}
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold text-white/95 truncate">
                              {file.fileName}
                            </span>
                            <span className="block text-[10px] text-white/40 mt-0.5">
                              {file.fileType} • {customOrderService.formatSize(file.fileSizeBytes)}
                            </span>
                          </div>
                        </div>

                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.03] text-white/70 hover:text-white transition-all"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-white/35">No design files attached.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quotations Sidebar */}
          <div className="space-y-6">
            {/* Active Quote Panel */}
            <Card className="border border-white/5">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-xs font-bold text-white/90 flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-purple-400" />
                  <span>Your Quote Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {activeQuote ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-white/45 uppercase font-bold block">Quoted Price</span>
                        <span className="text-sm font-bold text-white/95 block mt-0.5">
                          {productService.formatPrice(activeQuote.quotedPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/45 uppercase font-bold block">Turnaround</span>
                        <span className="text-sm font-bold text-white/95 block mt-0.5">
                          {activeQuote.estimatedDays} days
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-white/45 uppercase font-bold block">Valid Until</span>
                      <span className="text-xs text-white/70 block mt-0.5">
                        {ordersService.formatDate(activeQuote.validUntil)}
                      </span>
                    </div>

                    {activeQuote.notes && (
                      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70 leading-relaxed font-medium">
                        <span className="font-bold text-[9px] text-white/40 block mb-0.5 uppercase">Quote Notes</span>
                        {activeQuote.notes}
                      </div>
                    )}

                    <div className="border-t border-white/5 pt-4 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-[11px]"
                        onClick={() => {
                          setIsEditQuote(true);
                          quoteSetValue('quotedPrice', activeQuote.quotedPrice);
                          quoteSetValue('estimatedDays', activeQuote.estimatedDays);
                          quoteSetValue('notes', activeQuote.notes);
                          // formatting date string for datetime-local
                          const dateVal = new Date(activeQuote.validUntil).toISOString().substring(0, 16);
                          quoteSetValue('validUntil', dateVal);
                          setQuoteOpen(true);
                        }}
                      >
                        Edit Quote
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRecallQuote}
                        className="shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-2.5">
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                      <Clock className="h-5 w-5" />
                    </div>
                    <p className="text-[10px] text-white/35 max-w-[200px] mx-auto leading-relaxed">
                      You haven't submitted a quote for this print request. Accept the request for review to unlock quoting.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Request Timeline */}
            <Card className="border border-white/5">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-xs font-bold text-white/90">Request Status Flow</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {customOrder.timelineEvents && customOrder.timelineEvents.length > 0 ? (
                  <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-3 before:w-[1px] before:bg-white/5">
                    {customOrder.timelineEvents.map((event: any, index: number) => (
                      <div key={index} className="flex gap-4 relative">
                        <div className="h-6 w-6 rounded-full bg-[#0a0a0f] border border-white/10 flex items-center justify-center shrink-0 z-10 text-[9px] font-bold text-white/60">
                          {index + 1}
                        </div>
                        <div className="space-y-0.5">
                          <h6 className="text-xs font-bold text-white/90">{event.title}</h6>
                          <p className="text-[10px] text-white/40 leading-relaxed">{event.description}</p>
                          <span className="text-[9px] text-white/30 block font-medium">
                            {ordersService.formatDate(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-white/30 text-center py-4">No events logged yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Decline Dialog */}
        <Dialog
          isOpen={rejectOpen}
          onClose={() => {
            setRejectOpen(false);
            setRejectReason('');
          }}
          title="Decline Custom Request"
          description="Provide a brief explanation why you cannot fulfill this request"
        >
          <div className="space-y-4">
            <textarea
              placeholder="e.g. Current workload is high or specified custom filaments are currently out of stock..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="glass-input flex w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none min-h-[90px] border border-white/10"
            />
            <Button
              className="w-full"
              variant="destructive"
              onClick={handleReject}
              disabled={rejectReason.trim().length < 5 || isRejecting}
              isLoading={isRejecting}
            >
              Confirm Decline
            </Button>
          </div>
        </Dialog>

        {/* Quote Dialog */}
        <Dialog
          isOpen={quoteOpen}
          onClose={() => {
            setQuoteOpen(false);
            quoteReset();
            setFormError(null);
          }}
          title={isEditQuote ? 'Edit Quotation Details' : 'Send Quotation Offer'}
          description="Define pricing and timelines for this custom print specification"
        >
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 mb-4">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={quoteSubmit(onQuoteSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 ml-1">Quoted Price (INR)</label>
                <Input type="number" placeholder="1500" {...quoteRegister('quotedPrice', { valueAsNumber: true })} error={!!quoteErrors.quotedPrice} />
                {quoteErrors.quotedPrice && (
                  <p className="text-[9px] text-red-400 ml-1">{quoteErrors.quotedPrice.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 ml-1">Lead Time (Days)</label>
                <Input type="number" placeholder="5" {...quoteRegister('estimatedDays', { valueAsNumber: true })} error={!!quoteErrors.estimatedDays} />
                {quoteErrors.estimatedDays && (
                  <p className="text-[9px] text-red-400 ml-1">{quoteErrors.estimatedDays.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/60 ml-1">Quote Validity Date</label>
              <Input type="datetime-local" {...quoteRegister('validUntil')} error={!!quoteErrors.validUntil} />
              {quoteErrors.validUntil && (
                <p className="text-[9px] text-red-400 ml-1">{quoteErrors.validUntil.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/60 ml-1">Turnaround & Craft Notes (Optional)</label>
              <textarea
                placeholder="Detail infill density, PLA resolution parameters, post-processing options..."
                rows={3}
                className={`glass-input flex w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none min-h-[80px] border border-white/10 ${
                  quoteErrors.notes ? 'border-red-500/50 focus:border-red-500/60' : ''
                }`}
                {...quoteRegister('notes')}
              />
            </div>

            <Button type="submit" className="w-full mt-4" isLoading={isSendingQuote || isUpdatingQuote}>
              {isEditQuote ? 'Save Quotation Updates' : 'Submit Quotation Offer'}
            </Button>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
