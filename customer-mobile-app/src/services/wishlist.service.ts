import axiosInstance from './api.service';
import { API_ROUTES } from '../config/api';
import { Product } from './product.service';

export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  createdAt: string;
}

export interface Wishlist {
  id: string;
  customerId: string;
  items: WishlistItem[];
}

export const wishlistService = {
  getWishlist: async (): Promise<Wishlist> => {
    const res = await axiosInstance.get(API_ROUTES.wishlist.get);
    return res.data?.wishlist || { id: '', customerId: '', items: [] };
  },

  addToWishlist: async (productId: string): Promise<any> => {
    const res = await axiosInstance.post(API_ROUTES.wishlist.add, { productId });
    return res.data;
  },

  removeFromWishlist: async (idOrProductId: string): Promise<any> => {
    const res = await axiosInstance.delete(API_ROUTES.wishlist.remove(idOrProductId));
    return res.data;
  },
};
