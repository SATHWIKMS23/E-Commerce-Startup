export type RootStackParamList = {
  Home: undefined;
  MainTabs: undefined;
  Categories: undefined;
  Products: { q?: string; categoryId?: string } | undefined;
  Shops: undefined;
  Profile: undefined;
  ProductDetail: { productId: string };
  ShopDetail: { shopId: string };
  Cart: undefined;
  Checkout: {
    buyNow?: boolean;
    productId?: string;
    variantId?: string;
    quantity?: number;
  } | undefined;
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
  CustomOrders: undefined;
  Wishlist: undefined;
  Notifications: undefined;
  SupportChat: { orderId?: string; category?: string } | undefined;
  Login: { returnScreen?: string } | undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Products: { q?: string; categoryId?: string } | undefined;
  Shops: undefined;
  Orders: undefined;
  Profile: undefined;
};
