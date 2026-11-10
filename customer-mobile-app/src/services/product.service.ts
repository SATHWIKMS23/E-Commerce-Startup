import axiosInstance from './api.service';
import { API_ROUTES } from '../config/api';

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  priceDifference: number | string;
  stockQuantity: number;
}

export interface Product {
  id: string;
  shopId: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  stockQuantity: number;
  imageUrl?: string;
  images?: string[];
  isCustomizable?: boolean;
  isActive?: boolean;
  shop?: {
    id: string;
    name: string;
    slug?: string;
    logoUrl?: string;
  };
  category?: Category;
  variants?: ProductVariant[];
  averageRating?: number;
  reviewCount?: number;
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName?: string;
    avatarUrl?: string;
  };
}

export const productService = {
  formatPrice: (price: number | string | undefined | null): string => {
    if (price === undefined || price === null || isNaN(Number(price))) return '₹0.00';
    return `₹${Number(price).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },

  getCategories: async (): Promise<Category[]> => {
    const res = await axiosInstance.get(API_ROUTES.categories.allowed);
    return res.data?.categories || [];
  },

  getProducts: async (params?: {
    page?: number;
    limit?: number;
    searchQuery?: string;
    mode?: 'all' | 'recommended' | 'recently-viewed';
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
  }): Promise<{ products: Product[]; totalPages: number; total: number }> => {
    let url: string = API_ROUTES.products.list;
    if (params?.mode === 'recommended') {
      url = API_ROUTES.products.recommended;
    } else if (params?.mode === 'recently-viewed') {
      url = API_ROUTES.products.recentlyViewed;
    } else if (params?.searchQuery) {
      url = API_ROUTES.products.search;
    }

    const queryParams: any = {
      page: params?.page || 1,
      limit: params?.limit || 10,
    };

    if (params?.searchQuery) queryParams.q = params.searchQuery;
    if (params?.categoryId) queryParams.categoryId = params.categoryId;
    if (params?.minPrice !== undefined) queryParams.minPrice = params.minPrice;
    if (params?.maxPrice !== undefined) queryParams.maxPrice = params.maxPrice;
    if (params?.rating !== undefined) queryParams.rating = params.rating;

    const res = await axiosInstance.get(url, { params: queryParams });
    const data = res.data;
    return {
      products: data?.products || data || [],
      totalPages: data?.totalPages || 1,
      total: data?.total || (data?.products?.length ?? 0),
    };
  },

  getProductById: async (id: string): Promise<Product> => {
    const res = await axiosInstance.get(API_ROUTES.products.byId(id));
    return res.data?.product || res.data;
  },

  getProductReviews: async (id: string): Promise<Review[]> => {
    const res = await axiosInstance.get(API_ROUTES.products.reviews(id));
    return res.data?.reviews || [];
  },

  addReview: async (payload: {
    productId: string;
    rating: number;
    title?: string;
    comment?: string;
    orderItemId?: string;
  }): Promise<any> => {
    const res = await axiosInstance.post(API_ROUTES.reviews.create, payload);
    return res.data;
  },
};
