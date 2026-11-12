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

// Customer routes
import userAuth from './src/modules/customer/routes/authroutes.js';
import customerShopRoutes from './src/modules/customer/routes/shopRoute.js';
import customerProductRoutes from './src/modules/customer/routes/productRoute.js';
import customerCartRoutes from './src/modules/customer/routes/cartRoute.js';
import customerWishlistRoutes from './src/modules/customer/routes/wishlistRoute.js';
import customerCheckoutRoutes from './src/modules/customer/routes/checkoutRoute.js';
import customerPaymentRoutes from './src/modules/customer/routes/paymentRoute.js';
import customerOrderRoutes from './src/modules/customer/routes/orderRoute.js';
import customerReviewRoutes from './src/modules/customer/routes/reviewRoute.js';
import customerNotificationRoutes from './src/modules/customer/routes/notificationRoute.js';
import customerCustomOrderRoutes from './src/modules/customer/routes/customOrderRoute.js';
import customerCityRoute from './src/modules/customer/routes/cityRoute.js';
import customerCategoryRoute from './src/modules/customer/routes/categoryRoute.js';
import customerLocationRoute from './src/modules/customer/routes/locationRoute.js';
import customerReportRoute from './src/modules/customer/routes/reportRoute.js';
import customerConversationRoute from './src/modules/customer/routes/conversationRoute.js';
import customerAddressRoute from './src/modules/customer/routes/addressRoute.js';
import { setupChatWebSocketServer } from './src/services/chat/chat.service.js';
import corePaymentRoutes from './src/modules/payments/routes/paymentRoute.js';
import storageRoute from './src/modules/storage/routes/storage.routes.js';
import { publicBrandingRouter } from './src/modules/admin/routes/brandingRoute.js';

const app = express();
configureMiddlewares(app);

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
app.use('/users', customerCategoryRoute);
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
app.use('/users/api/reports', customerReportRoute);
app.use('/customer/api/reports', customerReportRoute);
app.use('/users/api/conversations', customerConversationRoute);
app.use('/customer/api/conversations', customerConversationRoute);
app.use('/', corePaymentRoutes);
app.use('/api/storage', storageRoute);

// Marketplace branding (public SSOT)
app.use('/api/branding', publicBrandingRouter);
app.use('/users/api/branding', publicBrandingRouter);

//health route
app.get('/api/health', (req, res) => {
    res.json({status:'online' , provider:'Groq' , models :'GROQ_MODELS'})
});


configureErrorHandlers(app);

const PORT = Number(process.env.CUSTOMER_PORT || process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const server = http.createServer(app);
setupChatWebSocketServer(server);

console.log('[SERVER_START] ' + JSON.stringify({
    portConfigured: !!process.env.PORT,
    host: HOST,
    starting: true,
}));

server.listen(PORT, HOST, () => {
    console.log(`[SERVER_READY] Customer server is running on ${HOST}:${PORT}`);
});

server.on('error', (err) => {
    console.error('[SERVER_ERROR]', err?.message ?? err);
    // A listen failure (EADDRINUSE/EACCES) before the socket is bound leaves the
    // process alive with no open port, so a platform health/port scan times out
    // instead of restarting us. Exit so the process supervisor restarts cleanly.
    if (!server.listening) {
        console.error('[SERVER_ERROR] Fatal listen error - exiting process.');
        process.exit(1);
    }
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
