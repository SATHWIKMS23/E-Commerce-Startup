import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/productApi';

export function useProducts() {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await productApi.getProducts();
      return res.products;
    },
    staleTime: 60 * 1000,
  });

  const lowStockQuery = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: async () => {
      const res = await productApi.getLowStockProducts();
      return res.products;
    },
    staleTime: 60 * 1000,
  });

  const createProductMutation = useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      productApi.updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: productApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const restoreProductMutation = useMutation({
    mutationFn: productApi.restoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      productApi.updateStock(id, stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    products: productsQuery.data ?? [],
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    refetch: productsQuery.refetch,

    lowStockProducts: lowStockQuery.data ?? [],
    isLoadingLowStock: lowStockQuery.isLoading,

    createProduct: createProductMutation.mutateAsync,
    isCreating: createProductMutation.isPending,

    updateProduct: updateProductMutation.mutateAsync,
    isUpdating: updateProductMutation.isPending,

    deleteProduct: deleteProductMutation.mutateAsync,
    isDeleting: deleteProductMutation.isPending,

    restoreProduct: restoreProductMutation.mutateAsync,
    isRestoring: restoreProductMutation.isPending,

    updateStock: updateStockMutation.mutateAsync,
    isUpdatingStock: updateStockMutation.isPending,
  };
}
