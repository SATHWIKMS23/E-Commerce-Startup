import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { getJwtSecret, verifyAccessToken } from "../../config/token.js";
import { MessageSenderType, ConversationType, NotificationType } from "@prisma/client";
import { initRedis, getRedisClient, getRedisSubscriber, isRedisReady, isRedisOpen, isSubscriberReady, isSubscriberOpen } from "../../config/redis.js";
import { logger } from "../../config/logger.js";

export interface AuthenticatedClient {
    ws: WebSocket;
    actorType: "ADMIN" | "SELLER" | "CUSTOMER";
    actorId: string;
    actorName: string;
    subscribedConversations: Set<string>;
    isAlive: boolean;
}

const clients = new Map<WebSocket, AuthenticatedClient>();

// Unique Process ID to prevent duplicate loopback broadcasts across Redis Pub/Sub
const PROCESS_ID = `proc_${process.pid}_${Math.random().toString(36).substring(2, 9)}`;
export const WS_REDIS_CHANNEL = "atlasbasket:ws:events";

export function getProcessId(): string {
    return PROCESS_ID;
}

export function getConnectedClientCount(): number {
    return clients.size;
}

// Helper to authenticate token
async function authenticateToken(
    token: string,
    roleHint?: string
): Promise<{ actorType: "ADMIN" | "SELLER" | "CUSTOMER"; actorId: string; actorName: string } | null> {
    try {
        const secret = getJwtSecret();
        const customerSecret = process.env.JWT_SECRET_KEY || secret;

        // Try Admin
        if (!roleHint || roleHint === "admin") {
            try {
                let decoded: any;
                try {
                    decoded = verifyAccessToken(token);
                } catch {
                    decoded = jwt.verify(token, secret);
                }
                if (decoded && decoded.id) {
                    const admin = await prisma.admin.findUnique({
                        where: { id: decoded.id },
                        select: { id: true, firstName: true, lastName: true, isActive: true }
                    });
                    if (admin && admin.isActive) {
                        return {
                            actorType: "ADMIN",
                            actorId: admin.id,
                            actorName: `${admin.firstName || "Admin"} ${admin.lastName || ""}`.trim()
                        };
                    }
                }
            } catch {
                // Not admin, try next
            }
        }

        // Try Seller
        if (!roleHint || roleHint === "seller") {
            try {
                let decoded: any;
                try {
                    decoded = verifyAccessToken(token);
                } catch {
                    decoded = jwt.verify(token, secret);
                }
                if (decoded && (decoded.id || decoded.sellerId)) {
                    const sellerId = decoded.id || decoded.sellerId;
                    const seller = await prisma.seller.findUnique({
                        where: { id: sellerId },
                        select: { id: true, firstName: true, lastName: true, shop: { select: { name: true } } }
                    });
                    if (seller) {
                        return {
                            actorType: "SELLER",
                            actorId: seller.id,
                            actorName: seller.shop?.name || `${seller.firstName || "Seller"} ${seller.lastName || ""}`.trim()
                        };
                    }
                }
            } catch {
                // Not seller, try next
            }
        }

        // Try Customer
        if (!roleHint || roleHint === "customer") {
            try {
                const decoded: any = jwt.verify(token, customerSecret);
                if (decoded && decoded.id) {
                    const customer = await prisma.customer.findUnique({
                        where: { id: decoded.id },
                        select: { id: true, firstName: true, lastName: true, isBanned: true }
                    });
                    if (customer && !customer.isBanned) {
                        return {
                            actorType: "CUSTOMER",
                            actorId: customer.id,
                            actorName: `${customer.firstName || "Customer"} ${customer.lastName || ""}`.trim()
                        };
                    }
                }
            } catch {
                // Not customer
            }
        }

        return null;
    } catch (err) {
        return null;
    }
}

function extractCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

let wssInstance: WebSocketServer | null = null;
let isSubscribed = false;
let isSubscribing = false;
let subscriberListenersAttached = false;

// ─── Redis Pub/Sub Metrics & Observability ─────────────────────────────────────

export interface RedisPubSubMetrics {
    publishedCount: number;
    publishFailureCount: number;
    receivedCount: number;
    receiveFailureCount: number;
    resubscribeSuccessCount: number;
    resubscribeFailureCount: number;
    lastPublishError: string | null;
    lastPublishErrorAt: string | null;
}

const pubSubMetrics: RedisPubSubMetrics = {
    publishedCount: 0,
    publishFailureCount: 0,
    receivedCount: 0,
    receiveFailureCount: 0,
    resubscribeSuccessCount: 0,
    resubscribeFailureCount: 0,
    lastPublishError: null,
    lastPublishErrorAt: null,
};

export function getRedisPubSubMetrics(): RedisPubSubMetrics {
    return { ...pubSubMetrics };
}

export function resetRedisPubSubMetrics(): void {
    pubSubMetrics.publishedCount = 0;
    pubSubMetrics.publishFailureCount = 0;
    pubSubMetrics.receivedCount = 0;
    pubSubMetrics.receiveFailureCount = 0;
    pubSubMetrics.resubscribeSuccessCount = 0;
    pubSubMetrics.resubscribeFailureCount = 0;
    pubSubMetrics.lastPublishError = null;
    pubSubMetrics.lastPublishErrorAt = null;
}

export function isRedisSubscribed(): boolean {
    return isSubscribed;
}

// ─── Deduplication Cache to Prevent Message Loops & Replays ───────────────────

const MAX_DEDUP_CACHE_SIZE = 5000;
const processedEventIds = new Set<string>();

function isDuplicateEvent(eventId?: string): boolean {
    if (!eventId) return false;
    if (processedEventIds.has(eventId)) return true;
    if (processedEventIds.size >= MAX_DEDUP_CACHE_SIZE) {
        const oldest = processedEventIds.values().next().value;
        if (oldest) processedEventIds.delete(oldest);
    }
    processedEventIds.add(eventId);
    return false;
}

/**
 * Resets internal chat service state for unit/integration tests.
 */
export function resetChatServiceForTesting(): void {
    isSubscribed = false;
    isSubscribing = false;
    subscriberListenersAttached = false;
    processedEventIds.clear();
    resetRedisPubSubMetrics();
}

/**
 * Publishes an event to the Redis Pub/Sub bus for cross-process distribution.
 * Returns true if successfully published to Redis, false if Redis is unavailable or publish failed.
 * Failures are observable through structured logs and metrics.
 */
export async function publishWSEvent(eventData: Record<string, any>): Promise<boolean> {
    const eventType = eventData.eventType || "UNKNOWN";

    if (!eventData.eventId) {
        eventData.eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    if (!eventData.timestamp) {
        eventData.timestamp = new Date().toISOString();
    }
    if (!eventData.originProcessId) {
        eventData.originProcessId = PROCESS_ID;
    }

    const client = getRedisClient();

    // Check readiness (not just connection-open state)
    if (!client || !isRedisReady()) {
        pubSubMetrics.publishFailureCount++;
        pubSubMetrics.lastPublishError = "Redis client is not ready";
        pubSubMetrics.lastPublishErrorAt = new Date().toISOString();
        logger.warn("[WS:Redis] Cross-process publish skipped: Redis is not ready", {
            eventType,
            originProcessId: eventData.originProcessId,
            isOpen: isRedisOpen(),
            isReady: isRedisReady()
        });
        return false;
    }

    try {
        await client.publish(WS_REDIS_CHANNEL, JSON.stringify(eventData));
        pubSubMetrics.publishedCount++;
        return true;
    } catch (err: any) {
        const errorMsg = err?.message ?? String(err);
        pubSubMetrics.publishFailureCount++;
        pubSubMetrics.lastPublishError = errorMsg;
        pubSubMetrics.lastPublishErrorAt = new Date().toISOString();
        logger.error("[WS:Redis] Publish event failed", {
            eventType,
            originProcessId: eventData.originProcessId,
            error: errorMsg,
            stack: err?.stack
        });
        return false;
    }
}

/**
 * Handles incoming events distributed from other API processes via Redis Pub/Sub.
 */
export function handleIncomingRedisEvent(rawMessage: string): void {
    try {
        const event = JSON.parse(rawMessage);
        if (!event) return;

        // 1. Loopback prevention: discard events originating from this exact process
        if (event.originProcessId === PROCESS_ID) {
            return;
        }

        // 2. Network deduplication: discard if duplicate eventId was already processed
        if (event.eventId && isDuplicateEvent(event.eventId)) {
            return;
        }

        pubSubMetrics.receivedCount++;

        switch (event.eventType) {
            case "CONVERSATION_BROADCAST": {
                const isInternal = Boolean(
                    event.isInternal ||
                    event.payload?.isInternal ||
                    event.payload?.message?.isInternal
                );
                broadcastLocalConversation(event.conversationId, event.payload, isInternal);
                break;
            }
            case "ADMIN_BROADCAST": {
                broadcastLocalAdmins(event.payload);
                break;
            }
            case "NOTIFICATION_BROADCAST": {
                deliverLocalNotification(event.recipientType, event.recipientId, event.notification);
                break;
            }
            case "DISCONNECT_ACTOR": {
                disconnectLocalActor(event.actorId, event.reason, event.actorType);
                break;
            }
            case "READ_RECEIPT": {
                const readPayload = event.payload || {
                    type: "read_receipt",
                    conversationId: event.conversationId,
                    readerType: event.readerType,
                    readerId: event.readerId,
                    readAt: event.readAt || new Date().toISOString()
                };
                broadcastLocalConversation(event.conversationId, readPayload, false);
                if (event.readerType === "ADMIN") {
                    broadcastLocalAdmins({
                        type: "unread_counts_update",
                        conversationId: event.conversationId
                    });
                }
                break;
            }
            case "TYPING": {
                const typingPayload = event.payload || {
                    type: "typing",
                    conversationId: event.conversationId,
                    actorType: event.actorType,
                    actorId: event.actorId,
                    actorName: event.actorName,
                    isTyping: Boolean(event.isTyping)
                };
                broadcastLocalConversation(event.conversationId, typingPayload, false);
                break;
            }
            default:
                logger.warn("[WS:Redis] Unhandled Redis event type received", { eventType: event.eventType });
                break;
        }
    } catch (err: any) {
        pubSubMetrics.receiveFailureCount++;
        logger.error("[WS:Redis] Error processing received event:", { error: err?.message ?? err });
    }
}

/**
 * Subscribes to the shared Redis Pub/Sub channel with automatic recovery on reconnect.
 */
export async function subscribeToRedisChatEvents(force = false): Promise<boolean> {
    if (isSubscribed && !force) return true;
    if (isSubscribing) return false;

    const subscriber = getRedisSubscriber();
    if (!subscriber) {
        logger.warn("[WS:Redis] Cannot subscribe: Redis subscriber client is null");
        return false;
    }

    // Attach lifecycle listeners once to ensure reliable subscriber recovery on reconnect
    if (!subscriberListenersAttached && typeof (subscriber as any).on === "function") {
        subscriberListenersAttached = true;

        (subscriber as any).on("ready", () => {
            logger.info(`[WS:Redis] Subscriber socket ready on process ${PROCESS_ID}. Triggering subscription recovery...`);
            subscribeToRedisChatEvents(true).catch((err) => {
                logger.error("[WS:Redis] Re-subscription after reconnect failed:", { error: err?.message ?? err });
            });
        });

        (subscriber as any).on("reconnecting", () => {
            isSubscribed = false;
            logger.warn(`[WS:Redis] Subscriber reconnecting on process ${PROCESS_ID}. Reset isSubscribed.`);
        });

        (subscriber as any).on("end", () => {
            isSubscribed = false;
            logger.info(`[WS:Redis] Subscriber disconnected on process ${PROCESS_ID}. Reset isSubscribed.`);
        });

        (subscriber as any).on("error", (err: any) => {
            isSubscribed = false;
            logger.error(`[WS:Redis] Subscriber error on process ${PROCESS_ID}:`, { error: err?.message ?? err });
        });
    }

    isSubscribing = true;
    try {
        if (!isSubscriberReady()) {
            if (typeof subscriber.connect === "function" && !subscriber.isOpen) {
                await subscriber.connect().catch((err: any) => {
                    logger.warn(`[WS:Redis] Subscriber connect attempt failed: ${err?.message ?? err}`);
                });
            }
        }

        if (isSubscriberReady()) {
            try {
                if (typeof subscriber.unsubscribe === "function") {
                    await subscriber.unsubscribe(WS_REDIS_CHANNEL).catch(() => {});
                }
            } catch {}

            await subscriber.subscribe(WS_REDIS_CHANNEL, (rawMessage: string) => {
                handleIncomingRedisEvent(rawMessage);
            });

            isSubscribed = true;
            pubSubMetrics.resubscribeSuccessCount++;
            logger.info(`[WS:Redis] Process ${PROCESS_ID} subscribed to ${WS_REDIS_CHANNEL}`);
            return true;
        } else {
            isSubscribed = false;
            logger.warn("[WS:Redis] Subscriber client is not ready. Awaiting ready event for subscription recovery.");
            return false;
        }
    } catch (err: any) {
        isSubscribed = false;
        pubSubMetrics.resubscribeFailureCount++;
        logger.error(`[WS:Redis] Subscription failed:`, { error: err?.message ?? err });
        return false;
    } finally {
        isSubscribing = false;
    }
}

export function setupChatWebSocketServer(httpServer: HttpServer) {
    if (wssInstance) return wssInstance;

    const wss = new WebSocketServer({ server: httpServer, path: "/ws/chat" });
    wssInstance = wss;

    // Initialize Redis and subscribe for cross-process WebSocket events
    initRedis()
        .then(() => subscribeToRedisChatEvents())
        .catch((err) => console.warn(`[WS] Redis setup warning: ${err?.message ?? err}`));

    // Heartbeat ping interval - bounded protocol health check
    // Only runs checks when active clients exist and unrefs so it never prevents natural process sleep
    const pingInterval = setInterval(() => {
        if (!wss || wss.clients.size === 0) return;
        wss.clients.forEach((ws) => {
            const client = clients.get(ws);
            if (!client || !client.isAlive) {
                if (client) {
                    client.subscribedConversations.clear();
                }
                clients.delete(ws);
                return ws.terminate();
            }
            client.isAlive = false;
            try {
                ws.ping();
            } catch {
                if (client) client.subscribedConversations.clear();
                clients.delete(ws);
            }
        });
    }, 35000);

    if (typeof pingInterval.unref === "function") {
        pingInterval.unref();
    }

    wss.on("close", () => {
        clearInterval(pingInterval);
        wssInstance = null;
    });

    wss.on("connection", async (ws: WebSocket, req) => {
        const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
        let token = url.searchParams.get("token");
        const role = url.searchParams.get("role") || undefined;

        // Auto-extract token from cookies if not in searchParams
        if (!token && req.headers.cookie) {
            if (role === "customer") {
                token = extractCookie(req.headers.cookie, "customer_session") || extractCookie(req.headers.cookie, "customer_token");
            } else if (role === "seller") {
                token = extractCookie(req.headers.cookie, "seller_session") || extractCookie(req.headers.cookie, "seller_access_token");
            } else if (role === "admin") {
                token = extractCookie(req.headers.cookie, "admin_session") || extractCookie(req.headers.cookie, "admin_access_token");
            }

            if (!token) {
                token = extractCookie(req.headers.cookie, "customer_session") ||
                        extractCookie(req.headers.cookie, "seller_session") ||
                        extractCookie(req.headers.cookie, "admin_session") ||
                        extractCookie(req.headers.cookie, "accessToken") ||
                        extractCookie(req.headers.cookie, "token");
            }
        }

        // Auto-extract from Authorization header
        if (!token && req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        let authData: { actorType: "ADMIN" | "SELLER" | "CUSTOMER"; actorId: string; actorName: string } | null = null;

        if (token) {
            authData = await authenticateToken(token, role);
        }

        const client: AuthenticatedClient = {
            ws,
            actorType: authData?.actorType || (role === "admin" ? "ADMIN" : role === "seller" ? "SELLER" : "CUSTOMER"),
            actorId: authData?.actorId || "",
            actorName: authData?.actorName || "",
            subscribedConversations: new Set(),
            isAlive: true
        };

        clients.set(ws, client);

        ws.on("pong", () => {
            client.isAlive = true;
        });

        if (authData) {
            ws.send(JSON.stringify({
                type: "auth_success",
                actorType: client.actorType,
                actorId: client.actorId,
                actorName: client.actorName
            }));
        } else {
            ws.send(JSON.stringify({
                type: "auth_required",
                message: "Please send { type: 'auth', token: '...', role: '...' }"
            }));
        }

        ws.on("message", async (data) => {
            try {
                const messageStr = data.toString();
                const payload = JSON.parse(messageStr);

                switch (payload.type) {
                    case "auth": {
                        const verified = await authenticateToken(payload.token, payload.role);
                        if (!verified) {
                            return ws.send(JSON.stringify({ type: "error", message: "Invalid authentication credentials" }));
                        }
                        client.actorType = verified.actorType;
                        client.actorId = verified.actorId;
                        client.actorName = verified.actorName;
                        return ws.send(JSON.stringify({
                            type: "auth_success",
                            actorType: client.actorType,
                            actorId: client.actorId,
                            actorName: client.actorName
                        }));
                    }

                    case "join": {
                        if (!client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Authentication required" }));
                        }
                        const conversationId = String(payload.conversationId);
                        const conv = await prisma.conversation.findUnique({
                            where: { id: conversationId },
                            select: { id: true, type: true, customerId: true, sellerId: true }
                        });
                        if (!conv) {
                            return ws.send(JSON.stringify({ type: "error", message: "Conversation not found" }));
                        }

                        // Check authorization
                        if (client.actorType === "CUSTOMER" && conv.customerId !== client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Unauthorized for this conversation" }));
                        }
                        if (client.actorType === "SELLER" && conv.sellerId !== client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Unauthorized for this conversation" }));
                        }

                        client.subscribedConversations.add(conversationId);
                        return ws.send(JSON.stringify({ type: "joined", conversationId }));
                    }

                    case "leave": {
                        const conversationId = String(payload.conversationId);
                        client.subscribedConversations.delete(conversationId);
                        return ws.send(JSON.stringify({ type: "left", conversationId }));
                    }

                    case "send_message": {
                        if (!client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Authentication required" }));
                        }
                        const { conversationId, message, attachments = [], clientMessageId, isInternal = false } = payload;
                        if (!conversationId || (!message && (!attachments || attachments.length === 0))) {
                            return ws.send(JSON.stringify({ type: "error", message: "Message content or attachment required" }));
                        }

                        const conv = await prisma.conversation.findUnique({
                            where: { id: conversationId }
                        });
                        if (!conv) {
                            return ws.send(JSON.stringify({ type: "error", message: "Conversation not found" }));
                        }

                        if (client.actorType === "CUSTOMER" && conv.customerId !== client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Unauthorized for this conversation" }));
                        }
                        if (client.actorType === "SELLER" && conv.sellerId !== client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Unauthorized for this conversation" }));
                        }

                        // Check duplicate clientMessageId
                        if (clientMessageId) {
                            const existing = await prisma.conversationMessage.findFirst({
                                where: { conversationId, clientMessageId }
                            });
                            if (existing) {
                                return ws.send(JSON.stringify({
                                    type: "message_ack",
                                    clientMessageId,
                                    message: existing
                                }));
                            }
                        }

                        // Sender Type
                        let senderType: MessageSenderType = MessageSenderType.CUSTOMER;
                        if (client.actorType === "ADMIN") senderType = MessageSenderType.ADMIN;
                        else if (client.actorType === "SELLER") senderType = MessageSenderType.SELLER;

                        // Non-admin cannot create internal messages
                        const safeIsInternal = client.actorType === "ADMIN" ? Boolean(isInternal) : false;

                        const savedMessage = await prisma.$transaction(async (tx) => {
                            const msg = await tx.conversationMessage.create({
                                data: {
                                    conversationId,
                                    senderType,
                                    senderId: client.actorId,
                                    senderName: client.actorName,
                                    message: message ? message.trim() : "",
                                    attachments: Array.isArray(attachments) ? attachments : [],
                                    clientMessageId: clientMessageId || null,
                                    isInternal: safeIsInternal
                                }
                            });

                            await tx.conversation.update({
                                where: { id: conversationId },
                                data: {
                                    lastMessageAt: new Date(),
                                    status: conv.status === "RESOLVED" ? "OPEN" : conv.status
                                }
                            });

                            return msg;
                        });

                        if (client.actorType === "ADMIN") {
                            await prisma.conversationReadReceipt.upsert({
                                where: {
                                    conversationId_readerType_readerId: {
                                        conversationId,
                                        readerType: "ADMIN",
                                        readerId: client.actorId
                                    }
                                },
                                update: { lastReadAt: new Date() },
                                create: {
                                    conversationId,
                                    readerType: "ADMIN",
                                    readerId: client.actorId,
                                    lastReadAt: new Date()
                                }
                            });
                        }

                        // Broadcast message to subscribed clients locally and across processes via Redis Pub/Sub
                        broadcastToConversation(conversationId, {
                            type: "new_message",
                            conversationId,
                            message: savedMessage
                        }, safeIsInternal);

                        // Broadcast conversation update and unread count notification to all admins
                        broadcastToAdmins({
                            type: "admin_conversation_update",
                            conversationId,
                            conversationType: conv.type,
                            lastMessage: savedMessage,
                            lastMessageAt: savedMessage.createdAt
                        });
                        broadcastToAdmins({
                            type: "unread_counts_update",
                            conversationId
                        });

                        if (!safeIsInternal && client.actorType === "ADMIN") {
                            import("../notification/notification.service.js").then(({ notificationService }) => {
                                if (conv.customerId) {
                                    notificationService.createNotification({
                                        recipientType: "CUSTOMER",
                                        recipientId: conv.customerId,
                                        type: "NEW_MESSAGE",
                                        title: "New Support Reply",
                                        body: savedMessage.message ? savedMessage.message.slice(0, 140) : "Support sent an attachment.",
                                        data: { route: "/profile", conversationId }
                                    }).catch(err => console.error("WS notify customer error:", err));
                                }
                                if (conv.sellerId) {
                                    notificationService.createNotification({
                                        recipientType: "SELLER",
                                        recipientId: conv.sellerId,
                                        type: "NEW_MESSAGE",
                                        title: "New Support Reply",
                                        body: savedMessage.message ? savedMessage.message.slice(0, 140) : "Support sent an attachment.",
                                        data: { route: "/support-chat", conversationId }
                                    }).catch(err => console.error("WS notify seller error:", err));
                                }
                            }).catch(err => console.error("Dynamic import error:", err));
                        }

                        // Ack to sender
                        return ws.send(JSON.stringify({
                            type: "message_ack",
                            clientMessageId: clientMessageId || null,
                            message: savedMessage
                        }));
                    }

                    case "read": {
                        if (!client.actorId) return;
                        const conversationId = String(payload.conversationId);
                        await prisma.conversationReadReceipt.upsert({
                            where: {
                                conversationId_readerType_readerId: {
                                    conversationId,
                                    readerType: client.actorType,
                                    readerId: client.actorId
                                }
                            },
                            update: { lastReadAt: new Date() },
                            create: {
                                conversationId,
                                readerType: client.actorType,
                                readerId: client.actorId,
                                lastReadAt: new Date()
                            }
                        });

                        broadcastReadReceipt(conversationId, client.actorType, client.actorId).catch(() => {});
                        break;
                    }

                    case "typing": {
                        const conversationId = String(payload.conversationId);
                        broadcastTyping(
                            conversationId,
                            client.actorType,
                            client.actorId,
                            client.actorName,
                            Boolean(payload.isTyping),
                            ws
                        ).catch(() => {});
                        break;
                    }
                }
            } catch (err: any) {
                console.error("[WS] message handling error:", err);
                ws.send(JSON.stringify({ type: "error", message: err.message || "Failed to process message" }));
            }
        });

        const cleanupClient = () => {
            const client = clients.get(ws);
            if (client) {
                client.subscribedConversations.clear();
            }
            clients.delete(ws);
        };

        ws.on("close", cleanupClient);

        ws.on("error", (err) => {
            console.error("[WS] socket error:", err);
            cleanupClient();
        });
    });

    console.log(`[WS] Chat WebSocket Server initialized on /ws/chat (Process: ${PROCESS_ID})`);
    return wss;
}

// ─── Local Process Delivery Helpers ──────────────────────────────────────────

function broadcastLocalAdmins(payload: any, excludeWs?: WebSocket): void {
    const raw = JSON.stringify(payload);
    for (const [ws, client] of clients.entries()) {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN && client.actorType === "ADMIN") {
            try {
                ws.send(raw);
            } catch {
                // Ignore socket send error
            }
        }
    }
}

function broadcastLocalConversation(
    conversationId: string,
    payload: any,
    isInternal: boolean = false,
    excludeWs?: WebSocket
): void {
    const raw = JSON.stringify(payload);
    const strictlyInternal = Boolean(isInternal || payload?.isInternal || payload?.message?.isInternal);

    for (const [ws, client] of clients.entries()) {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            // Internal messages strictly delivered only to ADMIN actors
            if (strictlyInternal && client.actorType !== "ADMIN") continue;

            if (client.subscribedConversations.has(conversationId)) {
                try {
                    ws.send(raw);
                } catch {
                    // Ignore socket send error
                }
            }
        }
    }
}

function disconnectLocalActor(
    actorId: string,
    reason: string = "Session expired",
    actorType?: string
): void {
    if (!actorId) return;
    for (const [ws, client] of clients.entries()) {
        if (client.actorId === actorId && (!actorType || client.actorType === actorType)) {
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "session_expired", message: reason }));
                    ws.close(4001, reason);
                }
            } catch {
                // Ignore socket close errors
            }
            clients.delete(ws);
        }
    }
}

function deliverLocalNotification(
    recipientType: string,
    recipientId: string,
    notification: any
): void {
    if (!recipientId) return;
    const raw = JSON.stringify({
        type: "notification",
        notification
    });
    for (const [ws, client] of clients.entries()) {
        if (
            ws.readyState === WebSocket.OPEN &&
            client.actorType === recipientType &&
            client.actorId === recipientId
        ) {
            try {
                ws.send(raw);
            } catch {
                // Ignore socket send error
            }
        }
    }
}

// ─── Public Cross-Process Broadcasters ───────────────────────────────────────

/**
 * Broadcasts an event to all connected admin clients locally and publishes
 * to Redis so admin clients connected to other processes also receive it.
 * Preserves local delivery if Redis publish fails.
 */
export async function broadcastToAdmins(payload: any, excludeWs?: WebSocket): Promise<boolean> {
    // 1. Deliver locally
    broadcastLocalAdmins(payload, excludeWs);

    // 2. Publish to Redis Pub/Sub for cross-process delivery
    return publishWSEvent({
        eventType: "ADMIN_BROADCAST",
        originProcessId: PROCESS_ID,
        payload
    });
}

/**
 * Broadcasts an event to all participants subscribed to a conversation room locally
 * and publishes to Redis for cross-process distribution.
 * Preserves local delivery if Redis publish fails.
 */
export async function broadcastToConversation(
    conversationId: string,
    payload: any,
    isInternal: boolean = false,
    excludeWs?: WebSocket
): Promise<boolean> {
    const safeInternal = Boolean(isInternal || payload?.isInternal || payload?.message?.isInternal);

    // 1. Deliver locally
    broadcastLocalConversation(conversationId, payload, safeInternal, excludeWs);

    // 2. Publish to Redis Pub/Sub for cross-process delivery
    return publishWSEvent({
        eventType: "CONVERSATION_BROADCAST",
        originProcessId: PROCESS_ID,
        conversationId,
        payload,
        isInternal: safeInternal
    });
}

/**
 * Broadcasts a read receipt locally and publishes a READ_RECEIPT event to Redis for cross-process delivery.
 */
export async function broadcastReadReceipt(
    conversationId: string,
    readerType: "ADMIN" | "SELLER" | "CUSTOMER",
    readerId: string,
    readAt: string = new Date().toISOString()
): Promise<boolean> {
    const payload = {
        type: "read_receipt",
        conversationId,
        readerType,
        readerId,
        readAt
    };

    // 1. Deliver locally
    broadcastLocalConversation(conversationId, payload, false);

    if (readerType === "ADMIN") {
        broadcastLocalAdmins({
            type: "unread_counts_update",
            conversationId
        });
    }

    // 2. Publish to Redis Pub/Sub
    return publishWSEvent({
        eventType: "READ_RECEIPT",
        originProcessId: PROCESS_ID,
        conversationId,
        readerType,
        readerId,
        readAt,
        payload
    });
}

/**
 * Broadcasts a typing indicator locally (excluding the typing client) and publishes a TYPING event to Redis for cross-process delivery.
 */
export async function broadcastTyping(
    conversationId: string,
    actorType: "ADMIN" | "SELLER" | "CUSTOMER",
    actorId: string,
    actorName: string,
    isTyping: boolean,
    excludeWs?: WebSocket
): Promise<boolean> {
    const payload = {
        type: "typing",
        conversationId,
        actorType,
        actorId,
        actorName,
        isTyping
    };

    // 1. Deliver locally (excluding originating sender socket)
    broadcastLocalConversation(conversationId, payload, false, excludeWs);

    // 2. Publish to Redis Pub/Sub
    return publishWSEvent({
        eventType: "TYPING",
        originProcessId: PROCESS_ID,
        conversationId,
        actorType,
        actorId,
        actorName,
        isTyping,
        payload
    });
}

/**
 * Terminates all active WebSocket connections for a specific actor across all API processes.
 * Preserves local disconnect if Redis publish fails.
 */
export async function disconnectActorSockets(
    actorId: string,
    reason: string = "Session expired",
    actorType?: "ADMIN" | "SELLER" | "CUSTOMER"
): Promise<boolean> {
    if (!actorId) return false;

    // 1. Disconnect local sockets
    disconnectLocalActor(actorId, reason, actorType);

    // 2. Publish to Redis Pub/Sub so other processes disconnect this actor's sockets
    return publishWSEvent({
        eventType: "DISCONNECT_ACTOR",
        originProcessId: PROCESS_ID,
        actorId,
        actorType,
        reason
    });
}

/**
 * Delivers a real-time notification to a specific actor across all API processes.
 * Preserves local delivery if Redis publish fails.
 */
export async function sendRealtimeNotification(
    recipientType: "ADMIN" | "SELLER" | "CUSTOMER" | "DELIVERY_PARTNER",
    recipientId: string,
    notification: any
): Promise<boolean> {
    if (!recipientId) return false;

    // 1. Deliver locally
    deliverLocalNotification(recipientType, recipientId, notification);

    // 2. Publish to Redis Pub/Sub for cross-process delivery
    return publishWSEvent({
        eventType: "NOTIFICATION_BROADCAST",
        originProcessId: PROCESS_ID,
        recipientType,
        recipientId,
        notification
    });
}
