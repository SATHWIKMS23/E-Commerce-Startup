/**
 * API Configuration — Single Source of Truth
 * Direct Mobile Endpoints pointing to AtlasBasket backend API
 */

export const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || 'https://api.atlasbasket.com';

export const API_ROUTES = {
  // ── Branding (Public & Fallback) ──────────────────────────────────────────
  branding: {
    public: `${BACKEND_BASE_URL}/api/branding/public`,
    main:   `${BACKEND_BASE_URL}/api/branding`,
  },

  // ── Categories ────────────────────────────────────────────────────────────
  categories: {
    allowed: `${BACKEND_BASE_URL}/users/api/categories/allowed`,
  },

  // ── Auth & Profile ────────────────────────────────────────────────────────
  auth: {
    login:          `${BACKEND_BASE_URL}/users/api/auth/login`,
    google:         `${BACKEND_BASE_URL}/users/api/auth/google`,
    register:       `${BACKEND_BASE_URL}/users/api/auth/register`,
    logout:         `${BACKEND_BASE_URL}/users/api/auth/logout`,
    refresh:        `${BACKEND_BASE_URL}/users/api/auth/refresh`,
    profile:        `${BACKEND_BASE_URL}/users/api/auth/profile`,
    profileEdit:    `${BACKEND_BASE_URL}/users/api/auth/profile/edit`,
    profileUpdate:  `${BACKEND_BASE_URL}/users/api/auth/profile/update`,
    forgotPassword: `${BACKEND_BASE_URL}/users/api/auth/forgot-password`,
    resetPassword:  `${BACKEND_BASE_URL}/users/api/auth/reset-password`,
    deactivate:     `${BACKEND_BASE_URL}/users/api/auth/deactivate`,
    deleteAccount:  `${BACKEND_BASE_URL}/users/api/auth/delete`,
  },

  // ── Addresses & Location ──────────────────────────────────────────────────
  addresses: {
    list:       `${BACKEND_BASE_URL}/customer/addresses`,
    create:     `${BACKEND_BASE_URL}/customer/addresses`,
    byId:       (id: string) => `${BACKEND_BASE_URL}/customer/addresses/${id}`,
    setDefault: (id: string) => `${BACKEND_BASE_URL}/customer/addresses/${id}/default`,
    states:     `${BACKEND_BASE_URL}/customer/addresses/locations/states`,
    districts:  (state: string) => `${BACKEND_BASE_URL}/customer/addresses/locations/districts?state=${encodeURIComponent(state)}`,
  },

  // ── Shops ─────────────────────────────────────────────────────────────────
  shops: {
    list:       `${BACKEND_BASE_URL}/users/api/shops`,
    featured:   `${BACKEND_BASE_URL}/users/api/shops/featured`,
    nearby:     `${BACKEND_BASE_URL}/users/api/shops/nearby`,
    search:     `${BACKEND_BASE_URL}/users/api/shops/search`,
    bySlug:     (slug: string) => `${BACKEND_BASE_URL}/users/api/shops/${slug}`,
  },

  // ── Products ──────────────────────────────────────────────────────────────
  products: {
    list:           `${BACKEND_BASE_URL}/users/api/products`,
    featured:       `${BACKEND_BASE_URL}/users/api/products/featured`,
    recommended:    `${BACKEND_BASE_URL}/users/api/products/recommended`,
    recentlyViewed: `${BACKEND_BASE_URL}/users/api/products/recently-viewed`,
    search:         `${BACKEND_BASE_URL}/users/api/products/search`,
    filter:         `${BACKEND_BASE_URL}/users/api/products/filter`,
    byId:           (id: string) => `${BACKEND_BASE_URL}/users/api/products/${id}`,
    reviews:        (productId: string) => `${BACKEND_BASE_URL}/users/api/products/${productId}/reviews`,
  },

  // ── Cart ──────────────────────────────────────────────────────────────────
  cart: {
    get:    `${BACKEND_BASE_URL}/users/api/cart`,
    add:    `${BACKEND_BASE_URL}/users/api/cart`,
    update: (itemId: string) => `${BACKEND_BASE_URL}/users/api/cart/${itemId}`,
    remove: (itemId: string) => `${BACKEND_BASE_URL}/users/api/cart/${itemId}`,
    clear:  `${BACKEND_BASE_URL}/users/api/cart/clear`,
    moveToWishlist: (itemId: string) => `${BACKEND_BASE_URL}/users/api/cart/${itemId}/move-to-wishlist`,
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  orders: {
    list:     `${BACKEND_BASE_URL}/users/api/orders`,
    byId:     (id: string) => `${BACKEND_BASE_URL}/users/api/orders/${id}`,
    create:   `${BACKEND_BASE_URL}/users/api/orders`,
    invoice:  (id: string) => `${BACKEND_BASE_URL}/users/api/orders/${id}/invoice`,
  },

  // ── Custom Orders ─────────────────────────────────────────────────────────
  customOrders: {
    list:         `${BACKEND_BASE_URL}/users/api/custom-orders`,
    byId:         (id: string) => `${BACKEND_BASE_URL}/users/api/custom-orders/${id}`,
    create:       `${BACKEND_BASE_URL}/users/api/custom-orders`,
    cancel:       (id: string) => `${BACKEND_BASE_URL}/users/api/custom-orders/${id}/cancel`,
    acceptQuote:  (id: string, quoteId: string) => `${BACKEND_BASE_URL}/users/api/custom-orders/${id}/quotes/${quoteId}/accept`,
    rejectQuote:  (id: string, quoteId: string) => `${BACKEND_BASE_URL}/users/api/custom-orders/${id}/quotes/${quoteId}/reject`,
  },

  // ── Checkout ──────────────────────────────────────────────────────────────
  checkout: {
    summary:      `${BACKEND_BASE_URL}/users/api/checkout`,
    validate:     `${BACKEND_BASE_URL}/users/api/checkout/validate`,
    applyCoupon:  `${BACKEND_BASE_URL}/users/api/checkout/apply-coupon`,
    removeCoupon: `${BACKEND_BASE_URL}/users/api/checkout/remove-coupon`,
    paymentMethods:  `${BACKEND_BASE_URL}/users/api/checkout/payment-methods`,
    deliveryMethods: `${BACKEND_BASE_URL}/users/api/checkout/delivery-methods`,
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  payments: {
    create: `${BACKEND_BASE_URL}/users/api/payment/create`,
    verify: `${BACKEND_BASE_URL}/users/api/payment/verify`,
    cod:    `${BACKEND_BASE_URL}/users/api/payment/cod`,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    list:        `${BACKEND_BASE_URL}/users/api/notifications`,
    markRead:    (id: string) => `${BACKEND_BASE_URL}/users/api/notifications/${id}/read`,
    markAllRead: `${BACKEND_BASE_URL}/users/api/notifications/mark-all-read`,
    delete:      (id: string) => `${BACKEND_BASE_URL}/users/api/notifications/${id}`,
  },

  // ── Reviews ───────────────────────────────────────────────────────────────
  reviews: {
    create: `${BACKEND_BASE_URL}/users/api/reviews`,
    edit:   (reviewId: string) => `${BACKEND_BASE_URL}/users/api/reviews/${reviewId}`,
  },

  // ── Wishlist ──────────────────────────────────────────────────────────────
  wishlist: {
    get:    `${BACKEND_BASE_URL}/users/api/wishlist`,
    add:    `${BACKEND_BASE_URL}/users/api/wishlist`,
    remove: (productId: string) => `${BACKEND_BASE_URL}/users/api/wishlist/${productId}`,
  },

  // ── Support Chat & Issues ─────────────────────────────────────────────────
  chat: {
    conversations: `${BACKEND_BASE_URL}/customer/api/conversations`,
    conversationById: (id: string) => `${BACKEND_BASE_URL}/customer/api/conversations/${id}`,
    messages: (convId: string) => `${BACKEND_BASE_URL}/customer/api/conversations/${convId}/messages`,
    reportIssue: `${BACKEND_BASE_URL}/customer/api/reports`,
  },

  // ── File Storage ──────────────────────────────────────────────────────────
  storage: {
    upload: `${BACKEND_BASE_URL}/api/storage/upload`,
  },
} as const;
