import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useReviews } from '../hooks/useReviews';
import { ordersService } from '@/features/orders/services/ordersService';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Star, MessageSquare, Trash2, User } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface ReviewsPageProps {
  navigation: any;
}

export function ReviewsPage({ navigation }: ReviewsPageProps) {
  const { reviews, isLoading, replyToReview, deleteReply } = useReviews();
  const showToast = useUIStore((s) => s.showToast);
  const showConfirm = useConfirmStore((s) => s.showConfirm);

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await replyToReview({ id: reviewId, reply: replyText.trim() });
      setActiveReplyId(null);
      setReplyText('');
      showToast('Reply published successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit reply', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = (reviewId: string) => {
    showConfirm({
      title: 'Delete Reply',
      message: 'Are you sure you want to delete your public reply to this customer review?',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteReply(reviewId);
          showToast('Reply deleted', 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to delete reply', 'error');
        }
      },
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={13}
        color={i < rating ? Colors.yellow : 'rgba(255, 255, 255, 0.15)'}
        fill={i < rating ? Colors.yellow : 'transparent'}
        style={{ marginRight: 2 }}
      />
    ));
  };

  return (
    <DashboardLayout title="Reviews" navigation={navigation} currentRoute="/reviews">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Customer Reviews</Text>
          <Text style={styles.subtitle}>
            Read ratings from buyers, review product performance, and submit response replies.
          </Text>
        </View>

        {isLoading ? (
          <View style={{ gap: 10 }}>
            <Skeleton height={100} borderRadius={14} />
            <Skeleton height={100} borderRadius={14} />
          </View>
        ) : reviews.length > 0 ? (
          reviews.map((rev) => (
            <Card key={rev.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatarBox}>
                  {rev.customer?.avatarUrl ? (
                    <Image source={{ uri: rev.customer.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <User size={16} color="rgba(255, 255, 255, 0.4)" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>
                    {rev.customer?.firstName} {rev.customer?.lastName}
                  </Text>
                  <Text style={styles.productName}>
                    on {rev.product?.name || 'Product'} • {ordersService.formatDate(rev.createdAt)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>{renderStars(rev.rating)}</View>
              </View>

              {rev.comment ? (
                <Text style={styles.commentText}>&quot;{rev.comment}&quot;</Text>
              ) : null}

              {/* Existing Seller Reply */}
              {rev.reply ? (
                <View style={styles.replyBox}>
                  <View style={styles.replyHeader}>
                    <Text style={styles.replyTitle}>Your Store Response</Text>
                    <TouchableOpacity onPress={() => handleDeleteReply(rev.id)}>
                      <Trash2 size={13} color={Colors.rose} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.replyText}>{rev.reply}</Text>
                </View>
              ) : activeReplyId === rev.id ? (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <Input
                    placeholder="Write a respectful, helpful reply…"
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    numberOfLines={2}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                      variant="default"
                      size="sm"
                      loading={submitting}
                      onPress={() => handleReplySubmit(rev.id)}
                      style={{ flex: 1 }}
                    >
                      Post Reply
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => setActiveReplyId(null)}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </Button>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setActiveReplyId(rev.id);
                    setReplyText('');
                  }}
                  style={styles.replyBtn}
                >
                  <MessageSquare size={13} color={Colors.purpleLight} style={{ marginRight: 6 }} />
                  <Text style={styles.replyBtnText}>Reply to Customer</Text>
                </TouchableOpacity>
              )}
            </Card>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Star size={40} color="rgba(255, 255, 255, 0.2)" />
            <Text style={styles.emptyText}>No product reviews received yet.</Text>
          </View>
        )}
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  reviewCard: {
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatarBox: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  productName: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 1,
  },
  commentText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  replyBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
    padding: 10,
    marginTop: 4,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.purpleLight,
  },
  replyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 16,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginTop: 6,
  },
  replyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.purpleLight,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 8,
  },
});
