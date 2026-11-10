import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../api/reviewApi';

export function useReviews() {
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const res = await reviewApi.getReviews();
      return res.reviews;
    },
    staleTime: 30 * 1000,
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      reviewApi.replyToReview(id, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (id: string) => reviewApi.deleteReply(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  return {
    reviews: reviewsQuery.data ?? [],
    isLoading: reviewsQuery.isLoading,
    isError: reviewsQuery.isError,
    replyToReview: replyMutation.mutateAsync,
    deleteReply: deleteReplyMutation.mutateAsync,
  };
}
