import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, type UpdateSellerProfilePayload } from '../api/profileApi';

export function useSellerProfile() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['seller-profile-full'],
    queryFn: profileApi.getProfile,
    staleTime: 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateSellerProfilePayload) =>
      profileApi.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-profile-full'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return {
    profile: profileQuery.data ?? null,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    refetch: profileQuery.refetch,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
