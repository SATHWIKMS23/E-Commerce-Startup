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

// Seller routes
import sellerAuth from './src/modules/seller/routes/authroute.js';
import shopRoutes from './src/modules/seller/routes/shopRoute.js';
import sellerProfileRoute from './src/modules/seller/routes/profileRoute.js';
import sellerLocationRoute from './src/modules/seller/routes/locationRoute.js';
import sellerProducts from './src/modules/seller/routes/productRoute.js';
import ordersRoutes from './src/modules/seller/routes/ordersRoute.js';
import analyticsRoutes from './src/modules/seller/routes/analyticsRoute.js';
import customOrderRoutes from './src/modules/seller/routes/customOrderRoute.js';
import notificationRoutes from './src/modules/seller/routes/notificationRoute.js';
import payoutRoutes from './src/modules/seller/routes/payoutRoute.js';
import reviewRoutes from './src/modules/seller/routes/reviewRoute.js';
import sellerCategoryRoute from './src/modules/seller/routes/categoryRoute.js';
import sellerEnforcementRoute from './src/modules/seller/routes/enforcementRoute.js';
import sellerAppealRoute from './src/modules/seller/routes/appealRoute.js';
import sellerGuidelineRoute from './src/modules/seller/routes/guidelineRoute.js';
import sellerPolicyNoticeRoute from './src/modules/seller/routes/policyNoticeRoute.js';
import sellerCommissionStatementRoute from './src/modules/seller/routes/commissionStatementRoute.js';
import sellerConversationRoute from './src/modules/seller/routes/conversationRoute.js';
import { setupChatWebSocketServer } from './src/services/chat/chat.service.js';
import storageRoute from './src/modules/storage/routes/storage.routes.js';
import { publicBrandingRouter } from './src/modules/admin/routes/brandingRoute.js';

const app = express();
configureMiddlewares(app);

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
app.use('/seller', sellerCategoryRoute);
app.use('/seller/api/enforcement', sellerEnforcementRoute);
app.use('/seller/api/appeals', sellerAppealRoute);
app.use('/seller/api/guidelines', sellerGuidelineRoute);
app.use('/seller/api/policy-notices', sellerPolicyNoticeRoute);
app.use('/seller/api/commission-statements', sellerCommissionStatementRoute);
app.use('/seller/api/conversations', sellerConversationRoute);
app.use('/api/storage', storageRoute);

// Marketplace branding (public SSOT)
app.use('/api/branding', publicBrandingRouter);
app.use('/seller/api/branding', publicBrandingRouter);

//health route
app.get('/api/health', (req, res) => {
    res.json({status:'online' , provider:'Groq' , models :'GROQ_MODELS'})
});

configureErrorHandlers(app);

const PORT = Number(process.env.PORT || process.env.SELLER_PORT || 3002);
// Render injects the port via process.env.PORT and requires the server to bind
// on all interfaces (0.0.0.0), not just loopback, so the container health check
// can reach it. Binding to 0.0.0.0 is safe and expected in a PaaS container.
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);
setupChatWebSocketServer(server);

console.log('[SERVER_START] ' + JSON.stringify({
    portConfigured: !!process.env.PORT,
    host: HOST,
    starting: true,
}));

server.listen(PORT, HOST, () => {
    console.log(`[SERVER_READY] Seller server is running on ${HOST}:${PORT}`);
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

server.on('listening', () => {
    const addr = server.address();
    const boundPort = typeof addr === 'object' && addr ? addr.port : PORT;
    console.log(`[SERVER_READY] listening on ${HOST}:${boundPort}`);
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
