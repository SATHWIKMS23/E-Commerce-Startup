import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { getJwtSecret, verifyAccessToken } from "../../config/token.js";
import { MessageSenderType, ConversationType, NotificationType } from "@prisma/client";
import { initRedis, getRedisClient, getRedisSubscriber, isSubscriberReady } from "../../config/redis.js";

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

/**
 * Publishes an event to the Redis Pub/Sub bus for cross-process distribution.
 * Catches any Redis communication errors safely so local operations remain unaffected.
 */
export async function publishWSEvent(eventData: Record<string, any>): Promise<void> {
    try {
        const client = getRedisClient();
        if (client && client.isOpen) {
            await client.publish(WS_REDIS_CHANNEL, JSON.stringify(eventData));
        }
    } catch (err: any) {
        console.warn(`[WS:Redis] Publish event failed: ${err?.message ?? err}`);
    }
}

/**
 * Handles incoming events distributed from other API processes via Redis Pub/Sub.
 */
export function handleIncomingRedisEvent(rawMessage: string): void {
    try {
        const event = JSON.parse(rawMessage);
        if (!event || event.originProcessId === PROCESS_ID) {
            // Discard event originating from our own process to prevent duplicate broadcasts
            return;
        }

        switch (event.eventType) {
            case "CONVERSATION_BROADCAST":
                broadcastLocalConversation(event.conversationId, event.payload, event.isInternal);
                break;
            case "ADMIN_BROADCAST":
                broadcastLocalAdmins(event.payload);
                break;
            case "NOTIFICATION_BROADCAST":
                deliverLocalNotification(event.recipientType, event.recipientId, event.notification);
                break;
            case "DISCONNECT_ACTOR":
                disconnectLocalActor(event.actorId, event.reason);
                break;
        }
    } catch (err: any) {
        console.warn("[WS:Redis] Error processing received event:", err?.message ?? err);
    }
}

/**
 * Subscribes to the shared Redis Pub/Sub channel.
 */
export async function subscribeToRedisChatEvents(): Promise<void> {
    if (isSubscribed) return;

    const subscriber = getRedisSubscriber();
    if (!subscriber) return;

    try {
        if (!subscriber.isOpen) {
            await subscriber.connect().catch(() => {});
        }
        if (subscriber.isOpen) {
            await subscriber.subscribe(WS_REDIS_CHANNEL, (rawMessage: string) => {
                handleIncomingRedisEvent(rawMessage);
            });
            isSubscribed = true;
            console.log(`[WS:Redis] Process ${PROCESS_ID} subscribed to ${WS_REDIS_CHANNEL}`);
        }
    } catch (err: any) {
        console.warn(`[WS:Redis] Subscription error: ${err?.message ?? err}`);
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

                        broadcastToConversation(conversationId, {
                            type: "read_receipt",
                            conversationId,
                            readerType: client.actorType,
                            readerId: client.actorId,
                            readAt: new Date().toISOString()
                        });

                        if (client.actorType === "ADMIN") {
                            broadcastToAdmins({
                                type: "unread_counts_update",
                                conversationId
                            });
                        }
                        break;
                    }

                    case "typing": {
                        const conversationId = String(payload.conversationId);
                        broadcastToConversation(conversationId, {
                            type: "typing",
                            conversationId,
                            actorType: client.actorType,
                            actorId: client.actorId,
                            actorName: client.actorName,
                            isTyping: Boolean(payload.isTyping)
                        }, false, ws);
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
    for (const [ws, client] of clients.entries()) {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            // Internal messages strictly delivered only to ADMIN actors
            if (isInternal && client.actorType !== "ADMIN") continue;

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

function disconnectLocalActor(actorId: string, reason: string = "Session expired"): void {
    if (!actorId) return;
    for (const [ws, client] of clients.entries()) {
        if (client.actorId === actorId) {
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
 */
export function broadcastToAdmins(payload: any, excludeWs?: WebSocket): void {
    // 1. Deliver locally
    broadcastLocalAdmins(payload, excludeWs);

    // 2. Publish to Redis Pub/Sub for cross-process delivery
    publishWSEvent({
        eventType: "ADMIN_BROADCAST",
        originProcessId: PROCESS_ID,
        payload
    }).catch(() => {});
}

/**
 * Broadcasts an event to all participants subscribed to a conversation room locally
 * and publishes to Redis for cross-process distribution.
 */
export function broadcastToConversation(
    conversationId: string,
    payload: any,
    isInternal: boolean = false,
    excludeWs?: WebSocket
): void {
    // 1. Deliver locally
    broadcastLocalConversation(conversationId, payload, isInternal, excludeWs);

    // 2. Publish to Redis Pub/Sub for cross-process delivery
    publishWSEvent({
        eventType: "CONVERSATION_BROADCAST",
        originProcessId: PROCESS_ID,
        conversationId,
        payload,
        isInternal
    }).catch(() => {});
}

/**
 * Terminates all active WebSocket connections for a specific actor across all API processes.
 */
export function disconnectActorSockets(actorId: string, reason: string = "Session expired"): void {
    if (!actorId) return;

    // 1. Disconnect local sockets
    disconnectLocalActor(actorId, reason);

    // 2. Publish to Redis Pub/Sub so other processes disconnect this actor's sockets
    publishWSEvent({
        eventType: "DISCONNECT_ACTOR",
        originProcessId: PROCESS_ID,
        actorId,
        reason
    }).catch(() => {});
}

/**
 * Delivers a real-time notification to a specific actor across all API processes.
 */
export function sendRealtimeNotification(
    recipientType: "ADMIN" | "SELLER" | "CUSTOMER" | "DELIVERY_PARTNER",
    recipientId: string,
    notification: any
): void {
    if (!recipientId) return;

    // 1. Deliver locally
    deliverLocalNotification(recipientType, recipientId, notification);

    // 2. Publish to Redis Pub/Sub for cross-process delivery
    publishWSEvent({
        eventType: "NOTIFICATION_BROADCAST",
        originProcessId: PROCESS_ID,
        recipientType,
        recipientId,
        notification
    }).catch(() => {});
}
