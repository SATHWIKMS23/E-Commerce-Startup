import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';

export function useShop() {
  const queryClient = useQueryClient();

  const shopQuery = useQuery({
    queryKey: ['shop'],
    queryFn: async () => {
      try {
        const res = await shopApi.getShop();
        return res.shop;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 60 * 1000,
  });

  const bankQuery = useQuery({
    queryKey: ['bank-account'],
    queryFn: async () => {
      try {
        const res = await shopApi.getBankAccount();
        return res.bankAccount;
      } catch {
        return [];
      }
    },
    enabled: !!shopQuery.data,
  });

  const createShopMutation = useMutation({
    mutationFn: shopApi.createShop,
    onSuccess: (data) => {
      queryClient.setQueryData(['shop'], data.shop);
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const updateBannerMutation = useMutation({
    mutationFn: shopApi.updateBanner,
    onSuccess: (data) => {
      queryClient.setQueryData(['shop'], data.shop);
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const updateLogoMutation = useMutation({
    mutationFn: shopApi.updateLogo,
    onSuccess: (data) => {
      queryClient.setQueryData(['shop'], data.shop);
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const addBankAccountMutation = useMutation({
    mutationFn: shopApi.addBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-account'] });
    },
  });

  const updateShopMutation = useMutation({
    mutationFn: shopApi.updateShop,
    onSuccess: (data) => {
      queryClient.setQueryData(['shop'], data.shop);
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const submitBanAppealMutation = useMutation({
    mutationFn: shopApi.submitBanAppeal,
  });

  const deleteShopMutation = useMutation({
    mutationFn: shopApi.deleteShop,
    onSuccess: () => {
      queryClient.setQueryData(['shop'], null);
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const requestPackingFeeApprovalMutation = useMutation({
    mutationFn: shopApi.requestPackingFeeApproval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const togglePackingFeeMutation = useMutation({
    mutationFn: shopApi.togglePackingFee,
    onSuccess: (data) => {
      queryClient.setQueryData(['shop'], data.shop);
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  return {
    shop: shopQuery.data ?? null,
    hasShop: !!shopQuery.data,
    isLoadingShop: shopQuery.isLoading,
    isErrorShop: shopQuery.isError,
    refetchShop: shopQuery.refetch,

    bankAccounts: bankQuery.data ?? [],
    isLoadingBank: bankQuery.isLoading,
    refetchBank: bankQuery.refetch,

    createShop: createShopMutation.mutateAsync,
    isCreatingShop: createShopMutation.isPending,

    updateShop: updateShopMutation.mutateAsync,
    isUpdatingShop: updateShopMutation.isPending,

    updateBanner: updateBannerMutation.mutateAsync,
    isUpdatingBanner: updateBannerMutation.isPending,

    updateLogo: updateLogoMutation.mutateAsync,
    isUpdatingLogo: updateLogoMutation.isPending,

    addBankAccount: addBankAccountMutation.mutateAsync,
    isAddingBank: addBankAccountMutation.isPending,

    deleteShop: deleteShopMutation.mutateAsync,
    isDeletingShop: deleteShopMutation.isPending,

    submitBanAppeal: submitBanAppealMutation.mutateAsync,
    isSubmittingAppeal: submitBanAppealMutation.isPending,

    requestPackingFeeApproval: requestPackingFeeApprovalMutation.mutateAsync,
    isRequestingPackingFee: requestPackingFeeApprovalMutation.isPending,

    togglePackingFee: togglePackingFeeMutation.mutateAsync,
    isTogglingPackingFee: togglePackingFeeMutation.isPending,
  };
}
