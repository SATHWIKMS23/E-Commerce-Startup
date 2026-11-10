import axiosInstance from './api.service';
import { API_ROUTES } from '../config/api';
import { Product } from './product.service';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product: Product;
  variant?: {
    id: string;
    name: string;
    priceDifference: number | string;
  };
}

export interface Cart {
  id: string;
  customerId: string;
  items: CartItem[];
}

export const cartService = {
  getCart: async (): Promise<Cart> => {
    const res = await axiosInstance.get(API_ROUTES.cart.get);
    return res.data?.cart || { id: '', customerId: '', items: [] };
  },

  addToCart: async (productId: string, quantity: number = 1, variantId?: string): Promise<any> => {
    const res = await axiosInstance.post(API_ROUTES.cart.add, {
      productId,
      quantity,
      variantId,
    });
    return res.data;
  },

  updateQuantity: async (itemId: string, quantity: number): Promise<any> => {
    const res = await axiosInstance.patch(API_ROUTES.cart.update(itemId), {
      quantity,
    });
    return res.data;
  },

  removeItem: async (itemId: string): Promise<any> => {
    const res = await axiosInstance.delete(API_ROUTES.cart.remove(itemId));
    return res.data;
  },

  clearCart: async (): Promise<any> => {
    const res = await axiosInstance.delete(API_ROUTES.cart.clear);
    return res.data;
  },

  moveToWishlist: async (itemId: string): Promise<any> => {
    const res = await axiosInstance.post(API_ROUTES.cart.moveToWishlist(itemId));
    return res.data;
  },
};
