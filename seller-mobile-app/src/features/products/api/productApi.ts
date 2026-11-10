import axiosInstance from '@/lib/axios/axiosInstance';

export interface Product {
  id: string;
  name: string;
  stockQuantity: number;
  price: number;
  imageUrl: string;
  isDeleted: boolean;
  categoryId?: string;
  createdAt: string;
}

export interface ProductListResponse {
  count: number;
  products: Product[];
}

export const productApi = {
  getProducts: async (): Promise<ProductListResponse> => {
    const response = await axiosInstance.get('/seller/api/products');
    return response.data;
  },

  getLowStockProducts: async (threshold = 10): Promise<ProductListResponse> => {
    const response = await axiosInstance.get('/seller/api/products/low-stock', {
      params: { threshold },
    });
    return response.data;
  },

  createProduct: async (payload: {
    productname: string;
    productquantity: number;
    productprice: number;
    imageUrl: string;
    categoryId?: string;
  }): Promise<{ message: string; product: Product }> => {
    const response = await axiosInstance.post('/seller/api/products', payload);
    return response.data;
  },

  updateProduct: async (
    productId: string,
    payload: {
      productquantity?: number;
      productprice?: number;
      imageUrl?: string;
      categoryId?: string;
    }
  ): Promise<{ message: string; product: Product }> => {
    const response = await axiosInstance.put(`/seller/api/products/${productId}`, payload);
    return response.data;
  },

  deleteProduct: async (productId: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/seller/api/products/${productId}`);
    return response.data;
  },

  restoreProduct: async (productId: string): Promise<{ message: string; product: Product }> => {
    const response = await axiosInstance.patch(`/seller/api/products/${productId}/restore`);
    return response.data;
  },

  updateStock: async (
    productId: string,
    stock: number
  ): Promise<{ message: string; product: Product }> => {
    const response = await axiosInstance.patch(`/seller/api/products/${productId}/stock`, {
      stockQuantity: stock,
    });
    return response.data;
  },

  getAllowedCategories: async (): Promise<Array<{ id: string; name: string }>> => {
    const response = await axiosInstance.get('/seller/api/categories/allowed');
    return response.data.categories || response.data;
  },
};
