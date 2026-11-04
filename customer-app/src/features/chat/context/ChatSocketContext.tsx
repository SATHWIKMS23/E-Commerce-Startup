'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  senderId?: string;
  senderName?: string;
  message: string;
  attachments?: string[];
  clientMessageId?: string | null;
  status?: 'sending' | 'sent' | 'failed';
  isInternal?: boolean;
  createdAt: string;
}

export interface SendMessageOptions {
  message: string;
  attachments?: string[];
  clientMessageId?: string;
}

export interface ChatSocketContextType {
  connectionState: ConnectionState;
  isConnected: boolean;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, options: SendMessageOptions) => Promise<any>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  reconnect: () => void;
  subscribeEventListener: (listener: (event: any) => void) => () => void;
}

const ChatSocketContext = createContext<ChatSocketContextType | null>(null);

const MAX_DEDUP_SIZE = 500;

function resolveWebSocketUrl(token?: string | null): string {
  if (typeof window === 'undefined') return '';
  const envWs = process.env.NEXT_PUBLIC_WS_URL;
  let base: string;

  if (envWs) {
    base = envWs.replace(/\/$/, '');
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.hostname === 'localhost' && window.location.port === '3000') {
      base = `${protocol}//localhost:3001`;
    } else {
      base = `${protocol}//${window.location.host}`;
    }
  }

  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  return `${base}/ws/chat?role=customer${tokenParam}`;
}

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManuallyClosedRef = useRef(false);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSubscribedRoomsRef = useRef<Set<string>>(new Set());
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const listenersRef = useRef<Set<(event: any) => void>>(new Set());
  const activeConversationIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = activeConversationId;

  const isDeduplicated = useCallback((id?: string | null): boolean => {
    if (!id) return false;
    if (processedEventIdsRef.current.has(id)) return true;
    if (processedEventIdsRef.current.size >= MAX_DEDUP_SIZE) {
      const oldest = processedEventIdsRef.current.values().next().value;
      if (oldest) processedEventIdsRef.current.delete(oldest);
    }
    processedEventIdsRef.current.add(id);
    return false;
  }, []);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current);
      watchdogTimeoutRef.current = null;
    }
  }, []);

  const closeSocket = useCallback(() => {
    clearTimers();
    if (socketRef.current) {
      try {
        if (
          socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING
        ) {
          socketRef.current.close(1000, 'Client closed');
        }
      } catch {}
      socketRef.current = null;
    }
    setConnectionState('disconnected');
  }, [clearTimers]);

  // Handle incoming WebSocket messages and update TanStack Query cache in real-time
  const handleIncomingMessage = useCallback((payload: any) => {
    if (!payload || typeof payload !== 'object') return;

    // Notify custom listeners
    listenersRef.current.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('[WS] Listener error:', err);
      }
    });

    switch (payload.type) {
      case 'pong':
        // Heartbeat ACK
        break;

      case 'auth_success':
        // If active conversation exists, subscribe to it immediately
        if (activeConversationIdRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'join', conversationId: activeConversationIdRef.current }));
        }
        break;

      case 'new_message': {
        const msg: ChatMessage = payload.message;
        const convId = payload.conversationId || msg?.conversationId;
        if (!msg || !convId) break;

        const dedupKey = msg.id || msg.clientMessageId;
        if (isDeduplicated(dedupKey)) break;

        // 1. Update active conversation detail query cache
        queryClient.setQueryData(
          ['customer-conversation-detail', convId],
          (old: any) => {
            if (!old) return old;
            const existingMessages: ChatMessage[] = old.messages || old.conversation?.messages || [];

            // Check if this incoming message matches an optimistic in-flight message by clientMessageId
            let updated = false;
            const newMessages = existingMessages.map((m) => {
              if (
                (msg.clientMessageId && m.clientMessageId === msg.clientMessageId) ||
                (msg.id && m.id === msg.id)
              ) {
                updated = true;
                return { ...msg, status: 'sent' as const };
              }
              return m;
            });

            if (!updated) {
              newMessages.push({ ...msg, status: 'sent' as const });
            }

            // Maintain strict chronological ordering
            newMessages.sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            return {
              ...old,
              messages: newMessages,
              conversation: old.conversation ? { ...old.conversation, messages: newMessages } : undefined,
            };
          }
        );

        // 2. Update conversations list query cache in real-time
        queryClient.setQueryData(
          ['customer-conversations'],
          (old: any) => {
            if (!old || !Array.isArray(old.conversations)) {
              queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
              return old;
            }

            const currentActive = activeConversationIdRef.current;
            const isViewingThisConv = currentActive === convId;

            let found = false;
            const updatedConversations = old.conversations.map((c: any) => {
              if (c.id === convId) {
                found = true;
                const isFromOther = msg.senderType !== 'CUSTOMER';
                const newUnread = isViewingThisConv ? 0 : isFromOther ? (c.unreadCount || 0) + 1 : c.unreadCount || 0;
                return {
                  ...c,
                  lastMessage: msg,
                  lastMessageAt: msg.createdAt,
                  unreadCount: newUnread,
                };
              }
              return c;
            });

            if (!found) {
              queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
              return old;
            }

            // Re-sort conversations so most recently active moves to the top
            updatedConversations.sort(
              (a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            );

            return { ...old, conversations: updatedConversations };
          }
        );

        break;
      }

      case 'message_ack': {
        const { clientMessageId, message } = payload;
        if (!clientMessageId || !message) break;

        const convId = message.conversationId;
        if (convId) {
          queryClient.setQueryData(
            ['customer-conversation-detail', convId],
            (old: any) => {
              if (!old) return old;
              const existingMessages: ChatMessage[] = old.messages || old.conversation?.messages || [];
              const newMessages = existingMessages.map((m) => {
                if (m.clientMessageId === clientMessageId || m.id === clientMessageId) {
                  return { ...message, status: 'sent' as const };
                }
                return m;
              });
              return {
                ...old,
                messages: newMessages,
                conversation: old.conversation ? { ...old.conversation, messages: newMessages } : undefined,
              };
            }
          );
        }
        break;
      }

      case 'read_receipt': {
        const { conversationId } = payload;
        if (conversationId) {
          queryClient.invalidateQueries({ queryKey: ['customer-conversation-detail', conversationId] });
        }
        break;
      }

      case 'notification': {
        const notification = payload.notification;
        if (notification) {
          queryClient.setQueryData(['notifications'], (old: any) => {
            if (!old) {
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
              return old;
            }
            const currentList = Array.isArray(old.notifications) ? old.notifications : [];
            const exists = currentList.some((n: any) => n.id === notification.id);
            if (exists) return old;
            return {
              ...old,
              unreadCount: (old.unreadCount ?? 0) + 1,
              notifications: [notification, ...currentList],
            };
          });
        }
        break;
      }

      case 'conversation_status_updated': {
        const { conversationId, status: newStatus } = payload;
        if (conversationId) {
          queryClient.setQueryData(
            ['customer-conversations'],
            (old: any) => {
              if (!old || !Array.isArray(old.conversations)) return old;
              return {
                ...old,
                conversations: old.conversations.map((c: any) =>
                  c.id === conversationId ? { ...c, status: newStatus } : c
                ),
              };
            }
          );
          queryClient.invalidateQueries({ queryKey: ['customer-conversation-detail', conversationId] });
        }
        break;
      }

      case 'session_expired': {
        closeSocket();
        break;
      }

      default:
        break;
    }
  }, [closeSocket, isDeduplicated, queryClient]);

  // Establish persistent WebSocket connection
  const connect = useCallback(() => {
    if (status !== 'authenticated' || !session?.user) {
      closeSocket();
      return;
    }

    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return; // Already connecting or connected
    }

    isManuallyClosedRef.current = false;
    clearTimers();
    setConnectionState(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');

    try {
      const backendToken = (session as any)?.backendToken || null;
      const wsUrl = resolveWebSocketUrl(backendToken);
      if (!wsUrl) return;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        const wasReconnecting = reconnectAttemptsRef.current > 0;
        reconnectAttemptsRef.current = 0;

        // Re-subscribe to active room if exists
        if (activeConversationIdRef.current && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'join', conversationId: activeConversationIdRef.current }));
        }

        // Heartbeat Ping Interval (25s)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch {}
          }
        }, 25_000);

        // Seamless Reconnection Resync: backfill any missed events via REST API
        if (wasReconnecting) {
          queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
          if (activeConversationIdRef.current) {
            queryClient.invalidateQueries({
              queryKey: ['customer-conversation-detail', activeConversationIdRef.current],
            });
          }
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleIncomingMessage(payload);
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onclose = (event) => {
        clearTimers();
        socketRef.current = null;

        if (isManuallyClosedRef.current || event.code === 1000 || event.code === 4001) {
          setConnectionState('disconnected');
          return;
        }

        // Bounded exponential backoff with jitter
        setConnectionState('reconnecting');
        const attempts = reconnectAttemptsRef.current;
        reconnectAttemptsRef.current += 1;

        const baseDelay = Math.min(30_000, 1000 * Math.pow(1.5, Math.min(attempts, 8)));
        const jitter = Math.random() * 500;
        const delay = baseDelay + jitter;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isManuallyClosedRef.current && status === 'authenticated') {
            connect();
          }
        }, delay);
      };

      ws.onerror = () => {
        // Handled by onclose
      };
    } catch (err) {
      console.warn('[WS] Connection init error:', err);
      setConnectionState('disconnected');
    }
  }, [clearTimers, closeSocket, handleIncomingMessage, queryClient, session, status]);

  // Main lifecycle effect tied to authentication session
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      connect();
    } else if (status === 'unauthenticated') {
      isManuallyClosedRef.current = true;
      closeSocket();
    }

    return () => {
      // Keep socket open across route changes; only close when component tree unmounts completely
    };
  }, [status, session, connect, closeSocket]);

  // Clean disconnect on window beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      isManuallyClosedRef.current = true;
      if (socketRef.current) {
        try {
          socketRef.current.close(1000, 'Window unload');
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Room Subscription Methods
  const joinConversation = useCallback((conversationId: string) => {
    if (!conversationId) return;
    setActiveConversationId(conversationId);
    activeSubscribedRoomsRef.current.add(conversationId);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'join', conversationId }));
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    if (!conversationId) return;
    activeSubscribedRoomsRef.current.delete(conversationId);
    if (activeConversationIdRef.current === conversationId) {
      setActiveConversationId(null);
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'leave', conversationId }));
    }
  }, []);

  // Responsive Optimistic Message Sending with Retry & Rollback
  const sendMessage = useCallback(
    async (conversationId: string, options: SendMessageOptions) => {
      const text = options.message?.trim() || '';
      const attachments = options.attachments || [];
      if (!text && attachments.length === 0) return null;

      const clientMessageId =
        options.clientMessageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const optimisticMsg: ChatMessage = {
        id: clientMessageId,
        conversationId,
        senderType: 'CUSTOMER',
        senderName: session?.user?.name || 'You',
        message: text,
        attachments,
        clientMessageId,
        status: 'sending',
        createdAt: new Date().toISOString(),
      };

      // 1. Optimistically append message to conversation detail query cache immediately
      queryClient.setQueryData(
        ['customer-conversation-detail', conversationId],
        (old: any) => {
          if (!old) return old;
          const existing = old.messages || old.conversation?.messages || [];
          const exists = existing.some((m: ChatMessage) => m.clientMessageId === clientMessageId);
          const newMessages = exists
            ? existing.map((m: ChatMessage) => (m.clientMessageId === clientMessageId ? optimisticMsg : m))
            : [...existing, optimisticMsg];

          return {
            ...old,
            messages: newMessages,
            conversation: old.conversation ? { ...old.conversation, messages: newMessages } : undefined,
          };
        }
      );

      // 2. Optimistically update conversations list
      queryClient.setQueryData(['customer-conversations'], (old: any) => {
        if (!old || !Array.isArray(old.conversations)) return old;
        const updated = old.conversations.map((c: any) =>
          c.id === conversationId ? { ...c, lastMessage: optimisticMsg, lastMessageAt: optimisticMsg.createdAt } : c
        );
        updated.sort(
          (a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
        return { ...old, conversations: updated };
      });

      // 3. Send via WebSocket if connected, fallback to idempotent REST endpoint
      try {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'send_message',
              conversationId,
              message: text,
              attachments,
              clientMessageId,
            })
          );
        } else {
          // Socket not ready, send via REST API immediately
          const res = await axiosInstance.post(`/customer/api/conversations/${conversationId}/messages`, {
            message: text,
            attachments,
            clientMessageId,
          });

          const serverMsg = res.data?.message;
          if (serverMsg) {
            queryClient.setQueryData(
              ['customer-conversation-detail', conversationId],
              (old: any) => {
                if (!old) return old;
                const existing = old.messages || old.conversation?.messages || [];
                const newMessages = existing.map((m: ChatMessage) =>
                  m.clientMessageId === clientMessageId ? { ...serverMsg, status: 'sent' as const } : m
                );
                return {
                  ...old,
                  messages: newMessages,
                  conversation: old.conversation ? { ...old.conversation, messages: newMessages } : undefined,
                };
              }
            );
          }
          return res.data;
        }
      } catch (err) {
        // Mark optimistic message as failed
        queryClient.setQueryData(
          ['customer-conversation-detail', conversationId],
          (old: any) => {
            if (!old) return old;
            const existing = old.messages || old.conversation?.messages || [];
            const newMessages = existing.map((m: ChatMessage) =>
              m.clientMessageId === clientMessageId ? { ...m, status: 'failed' as const } : m
            );
            return {
              ...old,
              messages: newMessages,
              conversation: old.conversation ? { ...old.conversation, messages: newMessages } : undefined,
            };
          }
        );
        throw err;
      }
    },
    [queryClient, session]
  );

  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return;

      // 1. Send via WebSocket
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify({ type: 'read', conversationId }));
        } catch {}
      }

      // 2. Call REST API for persistence
      try {
        await axiosInstance.post(`/customer/api/conversations/${conversationId}/read`);
      } catch {}

      // 3. Clear local unread count in conversations query
      queryClient.setQueryData(['customer-conversations'], (old: any) => {
        if (!old || !Array.isArray(old.conversations)) return old;
        return {
          ...old,
          conversations: old.conversations.map((c: any) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          ),
        };
      });
    },
    [queryClient]
  );

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    isManuallyClosedRef.current = false;
    closeSocket();
    connect();
  }, [closeSocket, connect]);

  const subscribeEventListener = useCallback((listener: (event: any) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value: ChatSocketContextType = {
    connectionState,
    isConnected: connectionState === 'connected',
    activeConversationId,
    setActiveConversationId,
    joinConversation,
    leaveConversation,
    sendMessage,
    markConversationAsRead,
    reconnect,
    subscribeEventListener,
  };

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket(): ChatSocketContextType {
  const context = useContext(ChatSocketContext);
  if (!context) {
    throw new Error('useChatSocket must be used within a ChatSocketProvider');
  }
  return context;
}

