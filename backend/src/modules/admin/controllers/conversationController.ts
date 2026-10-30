import type { Request, Response } from "express";
import { ConversationType, ConversationStatus, MessageSenderType, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { broadcastToConversation, broadcastToAdmins, broadcastReadReceipt } from "../../../services/chat/chat.service.js";
import { notificationService } from "../../../services/notification/notification.service.js";

// ─── GET /api/admin/conversations/unread-counts ──────────────────────────────

export const getAdminUnreadCounts = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;

        const conversations = await prisma.conversation.findMany({
            select: {
                id: true,
                type: true,
                readReceipts: {
                    where: { readerType: "ADMIN", readerId: adminId },
                    select: { lastReadAt: true }
                },
                messages: {
                    where: { senderType: { not: MessageSenderType.ADMIN }, isInternal: false },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { createdAt: true }
                }
            }
        });

        let customerUnread = 0;
        let sellerUnread = 0;

        for (const c of conversations) {
            const lastIncoming = c.messages[0];
            if (!lastIncoming) continue;
            const lastReadAt = c.readReceipts[0]?.lastReadAt || new Date(0);
            if (new Date(lastIncoming.createdAt) > new Date(lastReadAt)) {
                if (c.type === ConversationType.CUSTOMER_ADMIN) {
                    customerUnread++;
                } else if (c.type === ConversationType.SELLER_ADMIN) {
                    sellerUnread++;
                }
            }
        }

        return res.status(200).json({
            customerUnread,
            sellerUnread,
            totalUnread: customerUnread + sellerUnread
        });
    } catch (error: any) {
        console.error("GET ADMIN UNREAD COUNTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/conversations ─────────────────────────────────────────────

export const getConversations = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const isUnreadFilter = req.query.status === "UNREAD";
        const type = typeof req.query.type === "string" && req.query.type
            ? (req.query.type as ConversationType)
            : undefined;
        const status = !isUnreadFilter && typeof req.query.status === "string" && req.query.status
            ? (req.query.status as ConversationStatus)
            : undefined;
        const search = typeof req.query.search === "string" && req.query.search.trim()
            ? req.query.search.trim()
            : undefined;

        const where: Prisma.ConversationWhereInput = {
            ...(type ? { type } : {}),
            ...(status ? { status } : {}),
            ...(search
                ? {
                      OR: [
                          { subject: { contains: search, mode: "insensitive" } },
                          { customer: { firstName: { contains: search, mode: "insensitive" } } },
                          { customer: { lastName: { contains: search, mode: "insensitive" } } },
                          { customer: { email: { contains: search, mode: "insensitive" } } },
                          { seller: { firstName: { contains: search, mode: "insensitive" } } },
                          { seller: { lastName: { contains: search, mode: "insensitive" } } },
                          { seller: { shop: { name: { contains: search, mode: "insensitive" } } } }
                      ]
                  }
                : {})
        };

        const [rawConversations, total] = await prisma.$transaction([
            prisma.conversation.findMany({
                where,
                orderBy: { lastMessageAt: "desc" },
                skip: isUnreadFilter ? 0 : skip,
                take: isUnreadFilter ? 100 : limit,
                include: {
                    customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                    seller: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            shop: { select: { id: true, name: true } }
                        }
                    },
                    assignedAdmin: { select: { id: true, firstName: true, lastName: true } },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { id: true, message: true, senderType: true, senderName: true, createdAt: true, isInternal: true }
                    },
                    readReceipts: {
                        where: { readerType: "ADMIN", readerId: adminId },
                        take: 1
                    },
                    _count: {
                        select: {
                            messages: true
                        }
                    }
                }
            }),
            prisma.conversation.count({ where })
        ]);

        const conversationsWithUnread = await Promise.all(
            rawConversations.map(async (c) => {
                const lastReadAt = c.readReceipts[0]?.lastReadAt || new Date(0);
                const unreadCount = await prisma.conversationMessage.count({
                    where: {
                        conversationId: c.id,
                        senderType: { not: MessageSenderType.ADMIN },
                        isInternal: false,
                        createdAt: { gt: lastReadAt }
                    }
                });

                return {
                    id: c.id,
                    type: c.type,
                    customerId: c.customerId,
                    sellerId: c.sellerId,
                    subject: c.subject,
                    status: c.status,
                    priority: c.priority,
                    assignedAdminId: c.assignedAdminId,
                    relatedEntityType: c.relatedEntityType,
                    relatedEntityId: c.relatedEntityId,
                    internalNotes: c.internalNotes,
                    lastMessageAt: c.lastMessageAt,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                    customer: c.customer,
                    seller: c.seller,
                    assignedAdmin: c.assignedAdmin,
                    messages: c.messages,
                    _count: c._count,
                    unreadCount
                };
            })
        );

        const filtered = isUnreadFilter
            ? conversationsWithUnread.filter((c) => c.unreadCount > 0)
            : conversationsWithUnread;

        const paginated = isUnreadFilter ? filtered.slice(skip, skip + limit) : filtered;
        const finalTotal = isUnreadFilter ? filtered.length : total;

        return res.status(200).json({
            conversations: paginated,
            pagination: {
                total: finalTotal,
                page,
                limit,
                pages: Math.ceil(finalTotal / limit) || 1
            }
        });
    } catch (error: any) {
        console.error("GET ADMIN CONVERSATIONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/conversations/:id ─────────────────────────────────────────

export const getConversationDetail = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);

        const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: {
                customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                seller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        shop: { select: { id: true, name: true } }
                    }
                },
                assignedAdmin: { select: { id: true, firstName: true, lastName: true } },
                messages: {
                    orderBy: { createdAt: "asc" }
                },
                readReceipts: true
            }
        });

        if (!conversation) return res.status(404).json({ message: "Conversation not found" });

        // Upsert admin read receipt upon viewing
        await prisma.conversationReadReceipt.upsert({
            where: {
                conversationId_readerType_readerId: {
                    conversationId: id,
                    readerType: "ADMIN",
                    readerId: adminId
                }
            },
            update: { lastReadAt: new Date() },
            create: {
                conversationId: id,
                readerType: "ADMIN",
                readerId: adminId,
                lastReadAt: new Date()
            }
        });

        // Broadcast read receipt to room and unread counts update to all admins
        broadcastReadReceipt(id, "ADMIN", adminId).catch(() => {});

        return res.status(200).json({ conversation: { ...conversation, unreadCount: 0 } });
    } catch (error: any) {
        console.error("GET CONVERSATION DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/conversations/:id/read ───────────────────────────────────

export const markConversationRead = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);

        await prisma.conversationReadReceipt.upsert({
            where: {
                conversationId_readerType_readerId: {
                    conversationId: id,
                    readerType: "ADMIN",
                    readerId: adminId
                }
            },
            update: { lastReadAt: new Date() },
            create: {
                conversationId: id,
                readerType: "ADMIN",
                readerId: adminId,
                lastReadAt: new Date()
            }
        });

        // Broadcast read receipt to room and unread counts update to all admins
        broadcastReadReceipt(id, "ADMIN", adminId).catch(() => {});

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("MARK CONVERSATION READ ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/conversations/:id/messages ───────────────────────────────

export const sendAdminMessage = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const { message, attachments = [], isInternal = false, clientMessageId } = req.body;

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

        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: { firstName: true, lastName: true }
        });

        const senderName = admin ? `${admin.firstName || "Admin"} ${admin.lastName || ""}`.trim() : "Support Agent";

        const { savedMessage, conv } = await prisma.$transaction(async (tx) => {
            const msg = await tx.conversationMessage.create({
                data: {
                    conversationId: id,
                    senderType: MessageSenderType.ADMIN,
                    senderId: adminId,
                    senderName,
                    message: message ? message.trim() : "",
                    attachments: Array.isArray(attachments) ? attachments : [],
                    clientMessageId: clientMessageId || null,
                    isInternal: Boolean(isInternal)
                }
            });

            const updatedConv = await tx.conversation.update({
                where: { id },
                data: {
                    lastMessageAt: new Date(),
                    status: ConversationStatus.PENDING
                }
            });

            return { savedMessage: msg, conv: updatedConv };
        });

        // Upsert admin read receipt so admin's own reply marks queue clear
        await prisma.conversationReadReceipt.upsert({
            where: {
                conversationId_readerType_readerId: {
                    conversationId: id,
                    readerType: "ADMIN",
                    readerId: adminId
                }
            },
            update: { lastReadAt: new Date() },
            create: {
                conversationId: id,
                readerType: "ADMIN",
                readerId: adminId,
                lastReadAt: new Date()
            }
        });

        // Broadcast to conversation subscribers
        broadcastToConversation(id, {
            type: "new_message",
            conversationId: id,
            message: savedMessage
        }, Boolean(isInternal));

        // Broadcast to all admins (for inboxes, notification badges, and list order)
        broadcastToAdmins({
            type: "admin_conversation_update",
            conversationId: id,
            conversationType: conv.type,
            lastMessage: savedMessage,
            lastMessageAt: savedMessage.createdAt
        });
        broadcastToAdmins({
            type: "unread_counts_update",
            conversationId: id
        });

        // Notify customer or seller if external message
        if (!isInternal) {
            if (conv.customerId) {
                notificationService.createNotification({
                    recipientType: "CUSTOMER",
                    recipientId: conv.customerId,
                    type: "NEW_MESSAGE",
                    title: "New Support Reply",
                    body: savedMessage.message ? savedMessage.message.slice(0, 140) : "Support sent an attachment.",
                    data: { route: "/profile", conversationId: id }
                }).catch(err => console.error("Admin msg notify customer error:", err));
            }
            if (conv.sellerId) {
                notificationService.createNotification({
                    recipientType: "SELLER",
                    recipientId: conv.sellerId,
                    type: "NEW_MESSAGE",
                    title: "New Support Reply",
                    body: savedMessage.message ? savedMessage.message.slice(0, 140) : "Support sent an attachment.",
                    data: { route: "/support-chat", conversationId: id }
                }).catch(err => console.error("Admin msg notify seller error:", err));
            }
        }

        return res.status(201).json({ message: savedMessage });
    } catch (error: any) {
        console.error("SEND ADMIN MESSAGE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── PATCH /api/admin/conversations/:id/status ────────────────────────────────

export const updateConversationStatus = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { status } = req.body;

        if (!status || !Object.values(ConversationStatus).includes(status)) {
            return res.status(400).json({ message: "Valid status is required" });
        }

        const updated = await prisma.conversation.update({
            where: { id },
            data: { status: status as ConversationStatus }
        });

        // Broadcast status update
        broadcastToConversation(id, {
            type: "conversation_status_updated",
            conversationId: id,
            status: updated.status
        }, false);

        broadcastToAdmins({
            type: "admin_conversation_update",
            conversationId: id,
            conversationType: updated.type,
            status: updated.status,
            lastMessageAt: updated.lastMessageAt
        });

        return res.status(200).json({ conversation: updated });
    } catch (error: any) {
        console.error("UPDATE CONVERSATION STATUS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── PATCH /api/admin/conversations/:id/assign ────────────────────────────────

export const assignConversation = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { adminId } = req.body;

        const updated = await prisma.conversation.update({
            where: { id },
            data: { assignedAdminId: adminId || null }
        });

        return res.status(200).json({ conversation: updated });
    } catch (error: any) {
        console.error("ASSIGN CONVERSATION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── PATCH /api/admin/conversations/:id/notes ─────────────────────────────────

export const updateConversationNotes = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { internalNotes } = req.body;

        const updated = await prisma.conversation.update({
            where: { id },
            data: { internalNotes: internalNotes ? internalNotes.trim() : null }
        });

        return res.status(200).json({ conversation: updated });
    } catch (error: any) {
        console.error("UPDATE CONVERSATION NOTES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
