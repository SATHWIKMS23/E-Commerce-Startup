import type { Request, Response } from "express";
import { ConversationType, ConversationStatus, MessageSenderType } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { broadcastToConversation, broadcastToAdmins, broadcastReadReceipt } from "../../../services/chat/chat.service.js";

// ─── GET /seller/api/conversations ───────────────────────────────────────────

export const getSellerConversations = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;

        const conversations = await prisma.conversation.findMany({
            where: {
                sellerId,
                type: ConversationType.SELLER_ADMIN
            },
            orderBy: { lastMessageAt: "desc" },
            include: {
                assignedAdmin: { select: { firstName: true, lastName: true } },
                messages: {
                    where: { isInternal: false },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { id: true, message: true, senderType: true, senderName: true, createdAt: true }
                },
                readReceipts: {
                    where: { readerType: "SELLER", readerId: sellerId },
                    take: 1
                }
            }
        });

        const formatted = await Promise.all(
            conversations.map(async (c) => {
                const lastReadAt = c.readReceipts[0]?.lastReadAt || new Date(0);
                const unreadCount = await prisma.conversationMessage.count({
                    where: {
                        conversationId: c.id,
                        isInternal: false,
                        senderType: { not: MessageSenderType.SELLER },
                        createdAt: { gt: lastReadAt }
                    }
                });

                return {
                    id: c.id,
                    subject: c.subject,
                    status: c.status,
                    priority: c.priority,
                    relatedEntityType: c.relatedEntityType,
                    relatedEntityId: c.relatedEntityId,
                    lastMessageAt: c.lastMessageAt,
                    createdAt: c.createdAt,
                    lastMessage: c.messages[0] || null,
                    unreadCount
                };
            })
        );

        return res.status(200).json({ conversations: formatted });
    } catch (error: any) {
        console.error("GET SELLER CONVERSATIONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /seller/api/conversations ──────────────────────────────────────────

export const startSellerConversation = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const { subject, relatedEntityType, relatedEntityId, initialMessage, attachments = [] } = req.body;

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: { shop: { select: { name: true } } }
        });

        const senderName = seller?.shop?.name || `${seller?.firstName || "Seller"} ${seller?.lastName || ""}`.trim();

        const { conversation, firstMessage } = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversation.create({
                data: {
                    type: ConversationType.SELLER_ADMIN,
                    sellerId,
                    subject: subject ? subject.trim() : "Seller Support Request",
                    relatedEntityType: relatedEntityType || null,
                    relatedEntityId: relatedEntityId || null,
                    status: ConversationStatus.OPEN,
                    lastMessageAt: new Date()
                }
            });

            let msg = null;
            if (initialMessage || (attachments && attachments.length > 0)) {
                msg = await tx.conversationMessage.create({
                    data: {
                        conversationId: conv.id,
                        senderType: MessageSenderType.SELLER,
                        senderId: sellerId,
                        senderName,
                        message: initialMessage ? initialMessage.trim() : "",
                        attachments: Array.isArray(attachments) ? attachments : [],
                        isInternal: false
                    }
                });
            }

            return { conversation: conv, firstMessage: msg };
        });

        // Broadcast new conversation and unread notification to all admins
        broadcastToAdmins({
            type: "admin_conversation_update",
            conversationId: conversation.id,
            conversationType: ConversationType.SELLER_ADMIN,
            lastMessage: firstMessage,
            lastMessageAt: conversation.lastMessageAt
        });
        broadcastToAdmins({
            type: "unread_counts_update",
            conversationId: conversation.id
        });

        return res.status(201).json({ conversation });
    } catch (error: any) {
        console.error("START SELLER CONVERSATION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /seller/api/conversations/:id/messages ───────────────────────────────

export const getSellerConversationMessages = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const id = String(req.params.id);

        const conv = await prisma.conversation.findUnique({
            where: { id },
            select: { id: true, sellerId: true, subject: true, status: true }
        });

        if (!conv || conv.sellerId !== sellerId) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const messages = await prisma.conversationMessage.findMany({
            where: {
                conversationId: id,
                isInternal: false
            },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                senderType: true,
                senderId: true,
                senderName: true,
                message: true,
                attachments: true,
                clientMessageId: true,
                createdAt: true
            }
        });

        // Mark as read
        await prisma.conversationReadReceipt.upsert({
            where: {
                conversationId_readerType_readerId: {
                    conversationId: id,
                    readerType: "SELLER",
                    readerId: sellerId
                }
            },
            update: { lastReadAt: new Date() },
            create: {
                conversationId: id,
                readerType: "SELLER",
                readerId: sellerId,
                lastReadAt: new Date()
            }
        });

        return res.status(200).json({ conversation: { ...conv, messages }, messages });
    } catch (error: any) {
        console.error("GET SELLER MESSAGES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /seller/api/conversations/:id/messages ──────────────────────────────

export const sendSellerMessage = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const id = String(req.params.id);
        const { message, attachments = [], clientMessageId } = req.body;

        const conv = await prisma.conversation.findUnique({
            where: { id },
            select: { id: true, sellerId: true, status: true }
        });

        if (!conv || conv.sellerId !== sellerId) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        if (!message && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ message: "Message or attachment is required" });
        }

        // Idempotency check: if message with this clientMessageId was already saved, return it safely
        if (clientMessageId) {
            const existing = await prisma.conversationMessage.findFirst({
                where: { conversationId: id, clientMessageId }
            });
            if (existing) {
                return res.status(200).json({ message: existing });
            }
        }

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: { shop: { select: { name: true } } }
        });

        const senderName = seller?.shop?.name || `${seller?.firstName || "Seller"} ${seller?.lastName || ""}`.trim();

        const savedMessage = await prisma.$transaction(async (tx) => {
            const msg = await tx.conversationMessage.create({
                data: {
                    conversationId: id,
                    senderType: MessageSenderType.SELLER,
                    senderId: sellerId,
                    senderName,
                    message: message ? message.trim() : "",
                    attachments: Array.isArray(attachments) ? attachments : [],
                    clientMessageId: clientMessageId || null,
                    isInternal: false
                }
            });

            await tx.conversation.update({
                where: { id },
                data: {
                    lastMessageAt: new Date(),
                    status: conv.status === "RESOLVED" ? ConversationStatus.OPEN : conv.status
                }
            });

            return msg;
        });

        broadcastToConversation(id, {
            type: "new_message",
            conversationId: id,
            message: savedMessage
        }, false);

        broadcastToAdmins({
            type: "admin_conversation_update",
            conversationId: id,
            conversationType: ConversationType.SELLER_ADMIN,
            lastMessage: savedMessage,
            lastMessageAt: savedMessage.createdAt
        });
        broadcastToAdmins({
            type: "unread_counts_update",
            conversationId: id
        });

        return res.status(201).json({ message: savedMessage });
    } catch (error: any) {
        console.error("SEND SELLER MESSAGE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /seller/api/conversations/:id/read ──────────────────────────────────

export const markSellerConversationRead = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const id = String(req.params.id);

        const conv = await prisma.conversation.findUnique({
            where: { id },
            select: { sellerId: true }
        });
        if (!conv || conv.sellerId !== sellerId) {
            return res.status(403).json({ message: "Unauthorized for this conversation" });
        }

        await prisma.conversationReadReceipt.upsert({
            where: {
                conversationId_readerType_readerId: {
                    conversationId: id,
                    readerType: "SELLER",
                    readerId: sellerId
                }
            },
            update: { lastReadAt: new Date() },
            create: {
                conversationId: id,
                readerType: "SELLER",
                readerId: sellerId,
                lastReadAt: new Date()
            }
        });

        broadcastReadReceipt(id, "SELLER", sellerId).catch(() => {});

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("MARK SELLER READ ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
