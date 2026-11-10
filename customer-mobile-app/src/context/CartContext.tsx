import React, { createContext, useContext, useEffect, useState } from 'react';
import { cartService, Cart, CartItem } from '../services/cart.service';
import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: Cart;
  cartCount: number;
  subtotal: number;
  isLoading: boolean;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (productId: string, quantity?: number, variantId?: string) => Promise<any>;
  updateQuantity: (itemId: string, quantity: number) => Promise<any>;
  removeItem: (itemId: string) => Promise<any>;
  clearCart: () => Promise<any>;
  moveToWishlist: (itemId: string) => Promise<any>;
  refreshCart: () => Promise<void>;
}

const defaultCart: Cart = {
  id: '',
  customerId: '',
  items: [],
};

const CartContext = createContext<CartContextValue>({
  cart: defaultCart,
  cartCount: 0,
  subtotal: 0,
  isLoading: false,
  cartOpen: false,
  setCartOpen: () => {},
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  clearCart: async () => {},
  moveToWishlist: async () => {},
  refreshCart: async () => {},
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart>(defaultCart);
  const [isLoading, setIsLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const refreshCart = async () => {
    if (!isAuthenticated) {
      setCart(defaultCart);
      return;
    }
    try {
      setIsLoading(true);
      const data = await cartService.getCart();
      setCart(data);
    } catch {
      // Ignore network errors
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [isAuthenticated]);

  const cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  const subtotal = cart.items.reduce((acc, item) => {
    const basePrice = Number(item.product?.price || 0);
    const varDiff = item.variant ? Number(item.variant.priceDifference || 0) : 0;
    return acc + (basePrice + varDiff) * item.quantity;
  }, 0);

  const addToCart = async (productId: string, quantity: number = 1, variantId?: string) => {
    const res = await cartService.addToCart(productId, quantity, variantId);
    await refreshCart();
    return res;
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      return removeItem(itemId);
    }
    const res = await cartService.updateQuantity(itemId, quantity);
    await refreshCart();
    return res;
  };

  const removeItem = async (itemId: string) => {
    const res = await cartService.removeItem(itemId);
    await refreshCart();
    return res;
  };

  const clearCart = async () => {
    const res = await cartService.clearCart();
    await refreshCart();
    return res;
  };

  const moveToWishlist = async (itemId: string) => {
    const res = await cartService.moveToWishlist(itemId);
    await refreshCart();
    return res;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        subtotal,
        isLoading,
        cartOpen,
        setCartOpen,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        moveToWishlist,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
