import 'dotenv/config';
import { validateEnv } from './src/config/envValidator.js';

// Validate environment
validateEnv();

import http from 'http';
import express from 'express';
import { configureMiddlewares, configureErrorHandlers } from './src/app.js';
import { prisma } from './src/config/prisma.js';
import { adminLimiter, webhookLimiter } from './src/middleware/rateLimiter.js';

// Delivery routes
import deliveryRoute from './src/modules/delivery/routes/deliveryRoute.js';
import sellerDeliveryRoute from './src/modules/delivery/routes/sellerDeliveryRoute.js';
import adminDeliveryRoute from './src/modules/delivery/routes/adminDeliveryRoute.js';
import riderRoute from './src/modules/delivery/routes/riderRoute.js';
import externalShopRoute from './src/modules/delivery/routes/externalShopRoute.js';
import deliveryWebhook from './src/modules/delivery/webhooks/deliveryWebhook.js';
import { setupChatWebSocketServer } from './src/services/chat/chat.service.js';

const app = express();
configureMiddlewares(app);

app.use('/', adminLimiter, deliveryRoute);
app.use('/', adminLimiter, sellerDeliveryRoute);
app.use('/api/admin', adminLimiter, adminDeliveryRoute);
app.use('/', riderRoute);
app.use('/', externalShopRoute);
app.use('/', webhookLimiter, deliveryWebhook);

configureErrorHandlers(app);

const PORT = Number(process.env.DELIVERY_PORT || process.env.PORT || 3004);
const server = http.createServer(app);
setupChatWebSocketServer(server);

server.listen(PORT, () => {
    console.log(`Delivery server is running on PORT : ${PORT}`);
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
        console.log("HTTP server closed.");
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
