/** dependences */
import express from 'express';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';

/** files import */
import userAuth from './modules/customer/routes/authroutes.js';
import customerShopRoutes from './modules/customer/routes/shopRoute.js';
import customerProductRoutes from './modules/customer/routes/productRoute.js';
import customerCartRoutes from './modules/customer/routes/cartRoute.js';
import customerWishlistRoutes from './modules/customer/routes/wishlistRoute.js';
import customerCheckoutRoutes from './modules/customer/routes/checkoutRoute.js';
import customerPaymentRoutes from './modules/customer/routes/paymentRoute.js';
import customerOrderRoutes from './modules/customer/routes/orderRoute.js';
import customerReviewRoutes from './modules/customer/routes/reviewRoute.js';
import customerNotificationRoutes from './modules/customer/routes/notificationRoute.js';
import customerCustomOrderRoutes from './modules/customer/routes/customOrderRoute.js';
import customerCityRoute from './modules/customer/routes/cityRoute.js';
import customerLocationRoute from './modules/customer/routes/locationRoute.js';
import customerAddressRoute from './modules/customer/routes/addressRoute.js';
import corePaymentRoutes from './modules/payments/routes/paymentRoute.js';

import sellerAuth from './modules/seller/routes/authroute.js';
import shopRoutes from './modules/seller/routes/shopRoute.js';
import sellerProfileRoute from './modules/seller/routes/profileRoute.js';
import sellerLocationRoute from './modules/seller/routes/locationRoute.js';
import { limiter, adminLimiter } from './middleware/rateLimiter.js';
import sellerProducts from './modules/seller/routes/productRoute.js';
import ordersRoutes from './modules/seller/routes/ordersRoute.js';
import analyticsRoutes from './modules/seller/routes/analyticsRoute.js';
import customOrderRoutes from './modules/seller/routes/customOrderRoute.js';
import notificationRoutes from './modules/seller/routes/notificationRoute.js';
import payoutRoutes from './modules/seller/routes/payoutRoute.js';
import reviewRoutes from './modules/seller/routes/reviewRoute.js';

import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { csrfOriginCheck } from './middleware/csrfOriginCheck.js';
import "./jobs/cron.js";

// Admin module routes
import adminAuthRoute from './modules/admin/routes/authRoute.js';
import adminAnalyticsRoute from './modules/admin/routes/analyticsRoute.js';
import adminSellerRoute from './modules/admin/routes/sellerRoute.js';
import adminCustomerRoute from './modules/admin/routes/customerRoute.js';
import adminShopRoute from './modules/admin/routes/shopRoute.js';
import adminProductRoute from './modules/admin/routes/productRoute.js';
import adminOrderRoute from './modules/admin/routes/orderRoute.js';
import adminPaymentRoute from './modules/admin/routes/paymentRoute.js';
import adminReviewRoute from './modules/admin/routes/reviewRoute.js';
import adminNotificationRoute from './modules/admin/routes/notificationRoute.js';
import adminReportRoute from './modules/admin/routes/reportRoute.js';
import adminCouponRoute from './modules/admin/routes/couponRoute.js';
import adminSettingsRoute from './modules/admin/routes/settingsRoute.js';
import adminLogRoute from './modules/admin/routes/logRoute.js';
import adminCityRoute from './modules/admin/routes/cityRoute.js';
import adminStateRoute from './modules/admin/routes/stateRoute.js';
import adminPaymentMethodRoute from './modules/admin/routes/paymentMethodRoute.js';
import adminDeliveryMethodRoute from './modules/admin/routes/deliveryMethodRoute.js';
import { ensureDefaultPaymentMethods } from './modules/admin/controllers/paymentMethodController.js';
import { ensureDefaultDeliveryMethods } from './modules/admin/controllers/deliveryMethodController.js';

// Trigger default seeders asynchronously on startup
ensureDefaultPaymentMethods().catch(err => console.error("Auto-seed payment methods failed:", err));
ensureDefaultDeliveryMethods().catch(err => console.error("Auto-seed delivery methods failed:", err));

// Delivery module routes
import deliveryRoute from './modules/delivery/routes/deliveryRoute.js';
import sellerDeliveryRoute from './modules/delivery/routes/sellerDeliveryRoute.js';
import adminDeliveryRoute from './modules/delivery/routes/adminDeliveryRoute.js';
import riderRoute from './modules/delivery/routes/riderRoute.js';
import externalShopRoute from './modules/delivery/routes/externalShopRoute.js';
import deliveryWebhook from './modules/delivery/webhooks/deliveryWebhook.js';
import storageRoute from './modules/storage/routes/storage.routes.js';
import { publicBrandingRouter, adminBrandingRouter } from './modules/admin/routes/brandingRoute.js';
import adminRolesRoute from './modules/admin/routes/rolesRoute.js';
import adminSessionRoute from './modules/admin/routes/sessionRoute.js';
import adminSupportTicketRoute from './modules/admin/routes/supportTicketRoute.js';
import { adminContentRouter, publicContentRouter } from './modules/admin/routes/contentRoute.js';
import adminReturnRoute from './modules/admin/routes/returnRoute.js';
import adminSellerVerificationRoute from './modules/admin/routes/sellerVerificationRoute.js';
import adminSellerStrikeRoute from './modules/admin/routes/sellerStrikeRoute.js';
import adminSellerPayoutRoute from './modules/admin/routes/sellerPayoutRoute.js';
import adminExportRoute from './modules/admin/routes/exportRoute.js';
import adminEnforcementRoute from './modules/admin/routes/enforcementRoute.js';
import adminAppealRoute from './modules/admin/routes/appealRoute.js';
import adminGuidelineRoute from './modules/admin/routes/guidelineRoute.js';
import adminPolicyNoticeRoute from './modules/admin/routes/policyNoticeRoute.js';
import adminCommissionStatementRoute from './modules/admin/routes/commissionStatementRoute.js';
import adminCaseReportRoute from './modules/admin/routes/caseReportRoute.js';
import adminPostmortemRoute from './modules/admin/routes/postmortemRoute.js';
import adminConversationRoute from './modules/admin/routes/conversationRoute.js';
import adminBadgeRoute from './modules/admin/routes/badgeRoute.js';

import sellerEnforcementRoute from './modules/seller/routes/enforcementRoute.js';
import sellerAppealRoute from './modules/seller/routes/appealRoute.js';
import sellerGuidelineRoute from './modules/seller/routes/guidelineRoute.js';
import sellerPolicyNoticeRoute from './modules/seller/routes/policyNoticeRoute.js';
import sellerCommissionStatementRoute from './modules/seller/routes/commissionStatementRoute.js';
import sellerConversationRoute from './modules/seller/routes/conversationRoute.js';

import customerReportRoute from './modules/customer/routes/reportRoute.js';
import customerConversationRoute from './modules/customer/routes/conversationRoute.js';
import { ensureDefaultRoles } from './modules/admin/services/permissionService.js';

ensureDefaultRoles().catch((err) => console.error('[RBAC] Role bootstrap failed:', err));

export const configureMiddlewares = (app: express.Express) => {
    if (process.env.NODE_ENV?.toLowerCase() === 'production') {
        app.set('trust proxy', 1);
    }

    /** middlewares */
    app.use(helmet());
    app.use(compression());
    app.use(express.json({
        limit: '10mb',
        verify: (req: any, res, buf) => {
            req.rawBody = buf;
        }
    }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));
    app.use(cookieParser());

    const normalizeOrigin = (o: string) => o.replace(/\/+$/, '').toLowerCase();

    const rawOrigins = [
        process.env.CORS_ORIGINS,
        process.env.CUSTOMER_FRONTEND_URL,
        process.env.SELLER_FRONTEND_URL,
        process.env.ADMIN_FRONTEND_URL,
        process.env.DELIVERY_FRONTEND_URL,
        process.env.FRONTEND_DELIVERY_URL,
        'https://atlasbasket.com',
        'https://www.atlasbasket.com',
        'https://seller.atlasbasket.com',
        'https://sellers.atlasbasket.com',
        'https://admin.atlasbasket.com',
        'https://delivery.atlasbasket.com',
    ].filter(Boolean).join(',').split(',').map(s => normalizeOrigin(s.trim())).filter(Boolean);

    const localDevOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8001',
        'http://localhost:8004',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8001',
        'http://127.0.0.1:8004',
    ].map(normalizeOrigin);

    const allowedOrigins = new Set([...rawOrigins, ...localDevOrigins]);

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Cookie',
            'X-Requested-With',
            'X-Seller-Token',
            'X-Customer-Token',
            'X-Admin-Token',
            'X-Refresh-Token'
        ],
        optionsSuccessStatus: 204,
    }));
    app.use(csrfOriginCheck);
    app.use(requestLogger);
    app.use(limiter);

    /** main route */
    app.get('/', (req: Request, res: Response) => {
        res.json({
            message: `Hello`
        });
    });

    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    });
};

export const configureErrorHandlers = (app: express.Express) => {
    app.use(errorHandler);
};

const app = express();
configureMiddlewares(app);

/** routes */
// user routes
app.use('/users', userAuth);
app.use('/customer', userAuth);
app.use('/users', customerShopRoutes);
app.use('/users', customerProductRoutes);
app.use('/users', customerCartRoutes);
app.use('/users', customerWishlistRoutes);
app.use('/users', customerCheckoutRoutes);
app.use('/users', customerPaymentRoutes);
app.use('/users', customerOrderRoutes);
app.use('/users', customerReviewRoutes);
app.use('/users', customerNotificationRoutes);
app.use('/customer', customerNotificationRoutes);
app.use('/users', customerCustomOrderRoutes);
app.use('/users/cities', customerCityRoute);
app.use('/customer/api/location', customerLocationRoute);
app.use('/users/api/location', customerLocationRoute);
app.use('/customer/addresses', customerAddressRoute);
app.use('/customer/api/addresses', customerAddressRoute);
app.use('/api/customer/addresses', customerAddressRoute);
app.use('/api/addresses', customerAddressRoute);
app.use('/users/addresses', customerAddressRoute);
app.use('/users/api/addresses', customerAddressRoute);
app.use('/users/api/customer/addresses', customerAddressRoute);
app.use('/', corePaymentRoutes);

app.use('/users/api/reports', customerReportRoute);
app.use('/customer/api/reports', customerReportRoute);
app.use('/users/api/conversations', customerConversationRoute);
app.use('/customer/api/conversations', customerConversationRoute);

//seller routes 
app.use('/seller', sellerAuth);
app.use('/seller', shopRoutes);
app.use('/seller', sellerProfileRoute);
app.use('/seller', sellerLocationRoute);
app.use('/seller', sellerProducts);
app.use('/seller', ordersRoutes);
app.use('/seller', analyticsRoutes);
app.use('/seller', customOrderRoutes);
app.use('/seller', notificationRoutes);
app.use('/seller', payoutRoutes);
app.use('/seller', reviewRoutes);
app.use('/seller/api/enforcement', sellerEnforcementRoute);
app.use('/seller/api/appeals', sellerAppealRoute);
app.use('/seller/api/guidelines', sellerGuidelineRoute);
app.use('/seller/api/policy-notices', sellerPolicyNoticeRoute);
app.use('/seller/api/commission-statements', sellerCommissionStatementRoute);
app.use('/seller/api/conversations', sellerConversationRoute);

// Admin routes
app.use('/api/admin/auth', adminLimiter, adminAuthRoute);  // handles /api/admin/auth/login, /api/admin/auth/setup/status etc.
app.use('/api/admin', adminLimiter, adminAuthRoute);        // handles /api/admin/profile, /api/admin/list, /api/admin/:id/status etc.
app.use('/admin', adminLimiter, adminAuthRoute);            // handles /admin/api/auth/setup/status (legacy)
app.use('/api/admin/analytics', adminLimiter, adminAnalyticsRoute);
app.use('/api/admin/sellers', adminLimiter, adminSellerRoute);
app.use('/api/admin/customers', adminLimiter, adminCustomerRoute);
app.use('/api/admin/shops', adminLimiter, adminShopRoute);
app.use('/api/admin/products', adminLimiter, adminProductRoute);
app.use('/api/admin/orders', adminLimiter, adminOrderRoute);
app.use('/api/admin/payments', adminLimiter, adminPaymentRoute);
app.use('/api/admin/reviews', adminLimiter, adminReviewRoute);
app.use('/api/admin/notifications', adminLimiter, adminNotificationRoute);
app.use('/api/admin/reports', adminLimiter, adminReportRoute);
app.use('/api/admin/coupons', adminLimiter, adminCouponRoute);
app.use('/api/admin/settings', adminLimiter, adminSettingsRoute);
app.use('/api/admin/settings/branding', adminLimiter, adminBrandingRouter);
app.use('/api/admin/logs', adminLimiter, adminLogRoute);
app.use('/api/admin/cities', adminLimiter, adminCityRoute);
app.use('/api/admin/states', adminLimiter, adminStateRoute);
app.use('/api/admin/payment-methods', adminLimiter, adminPaymentMethodRoute);
app.use('/api/admin/delivery-methods', adminLimiter, adminDeliveryMethodRoute);

// Delivery routes
app.use('/', deliveryRoute);
app.use('/', sellerDeliveryRoute);
app.use('/api/admin', adminLimiter, adminDeliveryRoute);
app.use('/', riderRoute);
app.use('/', externalShopRoute);
app.use('/', deliveryWebhook);
app.use('/api/storage', storageRoute);


// Admin: roles, sessions, support tickets, CMS, returns, seller centre, exports
app.use('/api/admin/roles', adminLimiter, adminRolesRoute);
app.use('/api/admin/sessions', adminLimiter, adminSessionRoute);
app.use('/api/admin/support-tickets', adminLimiter, adminSupportTicketRoute);
app.use('/api/admin/content', adminLimiter, adminContentRouter);
app.use('/api/admin/returns', adminLimiter, adminReturnRoute);
app.use('/api/admin/seller-verifications', adminLimiter, adminSellerVerificationRoute);
app.use('/api/admin/seller-strikes', adminLimiter, adminSellerStrikeRoute);
app.use('/api/admin/seller-enforcement', adminLimiter, adminEnforcementRoute);
app.use('/api/admin/appeals', adminLimiter, adminAppealRoute);
app.use('/api/admin/guidelines', adminLimiter, adminGuidelineRoute);
app.use('/api/admin/policy-notices', adminLimiter, adminPolicyNoticeRoute);
app.use('/api/admin/commission-statements', adminLimiter, adminCommissionStatementRoute);
app.use('/api/admin/cases', adminLimiter, adminCaseReportRoute);
app.use('/api/admin/postmortems', adminLimiter, adminPostmortemRoute);
app.use('/api/admin/conversations', adminLimiter, adminConversationRoute);
app.use('/api/admin/sidebar-badges', adminLimiter, adminBadgeRoute);
app.use('/api/admin/seller-payouts', adminLimiter, adminSellerPayoutRoute);
app.use('/api/admin/exports', adminLimiter, adminExportRoute);

// Public content blocks (Customer app home banners / promos)
app.use('/api/content/public', publicContentRouter);

// Marketplace branding (public SSOT for Customer, Seller and Admin frontends)
app.use('/api/branding', publicBrandingRouter);
app.use('/users/api/branding', publicBrandingRouter);
app.use('/seller/api/branding', publicBrandingRouter);

configureErrorHandlers(app);

export default app;
