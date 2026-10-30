import 'dotenv/config';
import { validateEnv } from './src/config/envValidator.js';

// Validate environment
validateEnv();

import { seedKarnatakaDistricts } from './src/config/seedDistricts.js';
seedKarnatakaDistricts().catch(console.error);

import http from 'http';
import express from 'express';
import { configureMiddlewares, configureErrorHandlers } from './src/app.js';
import { prisma } from './src/config/prisma.js';
import { closeRedis } from './src/config/redis.js';
import { adminLimiter } from './src/middleware/rateLimiter.js';

// Admin routes
import adminAuthRoute from './src/modules/admin/routes/authRoute.js';
import adminAnalyticsRoute from './src/modules/admin/routes/analyticsRoute.js';
import adminSellerRoute from './src/modules/admin/routes/sellerRoute.js';
import adminCustomerRoute from './src/modules/admin/routes/customerRoute.js';
import adminShopRoute from './src/modules/admin/routes/shopRoute.js';
import adminProductRoute from './src/modules/admin/routes/productRoute.js';
import adminOrderRoute from './src/modules/admin/routes/orderRoute.js';
import adminPaymentRoute from './src/modules/admin/routes/paymentRoute.js';
import adminReviewRoute from './src/modules/admin/routes/reviewRoute.js';
import adminNotificationRoute from './src/modules/admin/routes/notificationRoute.js';
import adminReportRoute from './src/modules/admin/routes/reportRoute.js';
import adminCouponRoute from './src/modules/admin/routes/couponRoute.js';
import adminSettingsRoute from './src/modules/admin/routes/settingsRoute.js';
import adminLogRoute from './src/modules/admin/routes/logRoute.js';
import adminCityRoute from './src/modules/admin/routes/cityRoute.js';
import adminStateRoute from './src/modules/admin/routes/stateRoute.js';
import adminCategoryRoute from './src/modules/admin/routes/categoryRoute.js';
import adminPaymentMethodRoute from './src/modules/admin/routes/paymentMethodRoute.js';
import adminDeliveryMethodRoute from './src/modules/admin/routes/deliveryMethodRoute.js';
import adminDeliveryRoute from './src/modules/delivery/routes/adminDeliveryRoute.js';
import { publicBrandingRouter, adminBrandingRouter } from './src/modules/admin/routes/brandingRoute.js';
import adminRolesRoute from './src/modules/admin/routes/rolesRoute.js';
import adminSessionRoute from './src/modules/admin/routes/sessionRoute.js';
import adminSupportTicketRoute from './src/modules/admin/routes/supportTicketRoute.js';
import { adminContentRouter, publicContentRouter } from './src/modules/admin/routes/contentRoute.js';
import adminReturnRoute from './src/modules/admin/routes/returnRoute.js';
import adminSellerVerificationRoute from './src/modules/admin/routes/sellerVerificationRoute.js';
import adminSellerStrikeRoute from './src/modules/admin/routes/sellerStrikeRoute.js';
import adminSellerPayoutRoute from './src/modules/admin/routes/sellerPayoutRoute.js';
import adminExportRoute from './src/modules/admin/routes/exportRoute.js';
import adminEnforcementRoute from './src/modules/admin/routes/enforcementRoute.js';
import adminAppealRoute from './src/modules/admin/routes/appealRoute.js';
import adminGuidelineRoute from './src/modules/admin/routes/guidelineRoute.js';
import adminPolicyNoticeRoute from './src/modules/admin/routes/policyNoticeRoute.js';
import adminCommissionStatementRoute from './src/modules/admin/routes/commissionStatementRoute.js';
import adminCaseReportRoute from './src/modules/admin/routes/caseReportRoute.js';
import adminPostmortemRoute from './src/modules/admin/routes/postmortemRoute.js';
import adminConversationRoute from './src/modules/admin/routes/conversationRoute.js';
import { setupChatWebSocketServer } from './src/services/chat/chat.service.js';
import { ensureDefaultRoles } from './src/modules/admin/services/permissionService.js';
import { ensureDefaultPaymentMethods } from './src/modules/admin/controllers/paymentMethodController.js';
import { ensureDefaultDeliveryMethods } from './src/modules/admin/controllers/deliveryMethodController.js';
import storageRoute from './src/modules/storage/routes/storage.routes.js';

ensureDefaultRoles().catch(err => console.error("Auto-seed admin roles failed:", err));
ensureDefaultPaymentMethods().catch(err => console.error("Auto-seed payment methods failed:", err));
ensureDefaultDeliveryMethods().catch(err => console.error("Auto-seed delivery methods failed:", err));

const app = express();
configureMiddlewares(app);

app.use('/api/admin/auth', adminLimiter, adminAuthRoute);  // /api/admin/auth/login, /api/admin/auth/setup/status
app.use('/api/admin', adminLimiter, adminAuthRoute);        // /api/admin/profile, /api/admin/list, /api/admin/:id/status
app.use('/admin', adminLimiter, adminAuthRoute);            // /admin/setup/status (legacy fallback)
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
app.use('/api/admin/seller-payouts', adminLimiter, adminSellerPayoutRoute);
app.use('/api/admin/exports', adminLimiter, adminExportRoute);

// Public content blocks (Customer app home banners / promos)
app.use('/api/content/public', publicContentRouter);
app.use('/api/branding', publicBrandingRouter);
app.use('/api/admin/logs', adminLimiter, adminLogRoute);
app.use('/api/admin/cities', adminLimiter, adminCityRoute);
app.use('/api/admin/states', adminLimiter, adminStateRoute);
app.use('/api/admin/categories', adminLimiter, adminCategoryRoute);
app.use('/api/admin/payment-methods', adminLimiter, adminPaymentMethodRoute);
app.use('/api/admin/delivery-methods', adminLimiter, adminDeliveryMethodRoute);
app.use('/api/admin', adminLimiter, adminDeliveryRoute);

// Platform SSOT routes (public sync APIs for Customer, Seller, Platform)

//health route
app.get('/api/health', (req, res) => {
    res.json({status:'online' , provider:'Groq' , models :'GROQ_MODELS'})
});


configureErrorHandlers(app);

const PORT = Number(process.env.ADMIN_PORT || process.env.PORT || 3003);
const server = http.createServer(app);
setupChatWebSocketServer(server);

server.listen(PORT, () => {
    console.log(`Admin server is running on PORT : ${PORT}`);
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
        console.log("HTTP server closed.");
        try {
            await closeRedis();
            console.log("Redis disconnected.");
        } catch (err) {
            console.error("Error during Redis disconnect:", err);
        }
        try {
            await prisma.$disconnect();
            console.log("Prisma disconnected.");
        } catch (err) {
            console.error("Error during Prisma disconnect:", err);
        }
        process.exit(0);
    });

    setTimeout(() => {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
    }, 10000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
