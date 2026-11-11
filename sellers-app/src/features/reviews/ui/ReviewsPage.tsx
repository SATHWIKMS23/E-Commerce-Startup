'use client';

import { useState } from 'react';
import { useReviews } from '../hooks/useReviews';
import { ordersService } from '@/features/orders/services/ordersService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { Star, MessageSquare, Reply, Trash2, User, AlertTriangle } from 'lucide-react';

import { useConfirmStore } from '@/lib/store/confirmStore';

export function ReviewsPage() {
  const { reviews, isLoading, isError, replyToReview, deleteReply } = useReviews();
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showToast = useUIStore((state) => state.showToast);
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      await replyToReview({ id: reviewId, reply: replyText.trim() });
      setActiveReplyId(null);
      setReplyText('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit reply.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyDelete = (reviewId: string) => {
    showConfirm({
      title: 'Delete Reply Response',
      message: 'Are you sure you want to delete your reply response to this customer review?',
      confirmText: 'Delete Reply',
      onConfirm: async () => {
        try {
          await deleteReply(reviewId);
        } catch (err: any) {
          showToast(err.message || 'Failed to delete reply.');
        }
      },
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'
        }`}
      />
    ));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl animate-fade-up">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Customer Reviews</h1>
          <p className="text-xs text-white/45">Read ratings from buyers, review product performance, and submit response replies.</p>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center space-y-4">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-400/60" />
            <p className="text-sm font-semibold text-red-400">Failed to load product reviews.</p>
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <Card key={rev.id} className="border border-white/5 bg-white/[0.01]">
                <CardContent className="pt-5 space-y-4">
                  {/* User & Rating */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3 items-center">
                      <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/60 shrink-0">
                        {rev.customer?.avatarUrl ? (
                          <img src={rev.customer.avatarUrl} loading="lazy" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <User className="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-white/90">
                          {rev.customer?.firstName} {rev.customer?.lastName}
                        </span>
                        <span className="block text-[10px] text-white/35">
                          Reviewed {ordersService.formatDate(rev.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex gap-0.5">{renderStars(rev.rating)}</div>
                      <span className="text-[10px] font-semibold text-purple-400 truncate max-w-[120px]">
                        {rev.product?.name}
                      </span>
                    </div>
                  </div>

                  {/* Comment */}
                  {rev.comment && (
                    <p className="text-xs text-white/70 leading-relaxed pl-12 font-medium">
                      "{rev.comment}"
                    </p>
                  )}

                  {/* Existing Reply */}
                  {rev.reply ? (
                    <div className="ml-12 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] flex justify-between items-start gap-4 animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <span className="text-[9px] text-purple-400 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                          <Reply className="h-3 w-3" />
                          <span>Your Response Reply</span>
                        </span>
                        <p className="text-xs text-white/60 leading-relaxed font-medium">
                          {rev.reply}
                        </p>
                      </div>

                      <button
                        onClick={() => handleReplyDelete(rev.id)}
                        className="text-white/45 hover:text-red-400 p-1 rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : activeReplyId !== rev.id ? (
                    <div className="pl-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[11px]"
                        onClick={() => {
                          setActiveReplyId(rev.id);
                          setReplyText('');
                        }}
                      >
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-white/40" />
                        <span>Reply Response</span>
                      </Button>
                    </div>
                  ) : null}

                  {/* Reply Input Box */}
                  {activeReplyId === rev.id && (
                    <div className="ml-12 space-y-3 pt-2 animate-in slide-in-from-top-1 duration-200">
                      <textarea
                        placeholder="Type your response reply to the customer review..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        className="glass-input flex w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none resize-none min-h-[60px] border border-white/10"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[11px]"
                          onClick={() => setActiveReplyId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="text-[11px]"
                          onClick={() => handleReplySubmit(rev.id)}
                          disabled={!replyText.trim() || isSubmitting}
                          isLoading={isSubmitting}
                        >
                          Post Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="glass-card p-16 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl glass mx-auto text-white/30">
              <Star className="h-6 w-6" />
            </div>
            <h4 className="text-xs font-bold text-white/70">No reviews published</h4>
            <p className="text-[10px] text-white/35 max-w-xs mx-auto leading-relaxed">
              Customers can review products after order deliveries are successfully completed.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
