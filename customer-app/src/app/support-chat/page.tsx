"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import axiosInstance from '@/lib/axios/axiosInstance';
import { storageService } from '@/features/storage/services/storage.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatSocket } from '@/features/chat/context/ChatSocketContext';
import {
  MessageSquare,
  Send,
  Circle,
  Plus,
  X,
  HelpCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Paperclip,
  Loader2,
  Package,
  Search,
  ChevronDown,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface OutgoingAttachment {
  name: string;
  url: string;
  type: string;
}

function SupportChatContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';
  const initialCategory = searchParams.get('category') || '';

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<OutgoingAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [failedMessage, setFailedMessage] = useState<{ text: string; clientMessageId: string } | null>(null);

  // New Inquiry Modal State
  const [showNewModal, setShowNewModal] = useState(!!initialOrderId);
  const [inquiryCategory, setInquiryCategory] = useState(initialCategory || (initialOrderId ? 'Order Issue' : 'General Question'));
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newInitialMessage, setNewInitialMessage] = useState('');
  const [modalAttachments, setModalAttachments] = useState<OutgoingAttachment[]>([]);
  const [modalUploadError, setModalUploadError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const modalAttachmentInputRef = useRef<HTMLInputElement>(null);
  const orderDropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Load customer's conversations
  const { data: convData, isLoading: isConvLoading } = useQuery({
    queryKey: ['customer-conversations'],
    queryFn: async () => {
      const res = await axiosInstance.get('/customer/api/conversations');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // Load customer's actual orders for the order dropdown
  const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['customer-orders-for-chat'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/orders');
      return res.data?.orders || [];
    },
    enabled: showNewModal,
    staleTime: 60 * 1000,
  });

  // Preselect order if initialOrderId is present in query parameters
  useEffect(() => {
    if (initialOrderId && orders.length > 0 && !selectedOrder) {
      const match = orders.find((o: any) => o.id === initialOrderId || o.orderNumber === initialOrderId);
      if (match) {
        setSelectedOrder(match);
        setInquiryCategory('Order Issue');
        if (!newSubject) {
          setNewSubject(`Issue with Order #${match.orderNumber}`);
        }
      }
    }
  }, [initialOrderId, orders, selectedOrder, newSubject]);

  // Click outside to close order dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orderDropdownRef.current && !orderDropdownRef.current.contains(e.target as Node)) {
        setIsOrderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persistent WebSocket connection across entire session
  const {
    connectionState,
    isConnected: wsConnected,
    joinConversation,
    sendMessage: sendPersistentMessage,
    markConversationAsRead,
    reconnect: reconnectSocket,
  } = useChatSocket();

  const [isSending, setIsSending] = useState(false);

  // Subscribe to conversation room & mark as read when selected
  useEffect(() => {
    if (selectedConversationId) {
      joinConversation(selectedConversationId);
      markConversationAsRead(selectedConversationId);
    }
  }, [selectedConversationId, joinConversation, markConversationAsRead]);

  // Load detail for selected conversation
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['customer-conversation-detail', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const res = await axiosInstance.get(`/customer/api/conversations/${selectedConversationId}`);
      return res.data;
    },
    enabled: !!selectedConversationId,
    refetchInterval: wsConnected ? false : 10000, // Light fallback polling only if WS offline
  });

  // Scroll to bottom on message updates
  const messages = detailData?.conversation?.messages || detailData?.messages || [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Optimistic message send handler with retry support
  const handleSendMessage = async (textOverride?: string, clientMessageIdOverride?: string) => {
    const textToSend = (textOverride ?? messageText).trim();
    const attachmentsToSend = pendingAttachments.map((a) => a.url);

    if (!textToSend && attachmentsToSend.length === 0) return;
    if (!selectedConversationId) return;

    const clientMsgId =
      clientMessageIdOverride ||
      `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    setMessageText('');
    setPendingAttachments([]);
    setFailedMessage(null);
    setIsSending(true);

    try {
      await sendPersistentMessage(selectedConversationId, {
        message: textToSend,
        attachments: attachmentsToSend,
        clientMessageId: clientMsgId,
      });
    } catch {
      setFailedMessage({
        text: textToSend,
        clientMessageId: clientMsgId,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle uploading attachments in active chat
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await storageService.uploadEvidenceFile(file, 'support');
        setPendingAttachments((prev) => [
          ...prev,
          { name: file.name, url: res.url, type: file.type },
        ]);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  // Handle uploading attachments in New Ticket modal
  const handleModalAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setModalUploadError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          setModalUploadError(`"${file.name}" exceeds 10MB limit.`);
          continue;
        }
        const res = await storageService.uploadEvidenceFile(file, 'support');
        setModalAttachments((prev) => [
          ...prev,
          { name: file.name, url: res.url, type: file.type },
        ]);
      }
    } catch (err: any) {
      setModalUploadError(err.message || 'Failed to upload file');
    } finally {
      if (modalAttachmentInputRef.current) modalAttachmentInputRef.current.value = '';
    }
  };

  // Start new conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async () => {
      if (!newSubject.trim() || !newInitialMessage.trim()) {
        throw new Error('Subject and message are required.');
      }

      const isOrderCategory = [
        'Order Issue',
        'Delivery Issue',
        'Payment Issue',
        'Return/Refund',
      ].includes(inquiryCategory);

      if (isOrderCategory && !selectedOrder) {
        throw new Error('Please select the order related to this inquiry.');
      }

      const res = await axiosInstance.post('/customer/api/conversations', {
        category: inquiryCategory,
        subject: newSubject.trim(),
        orderId: selectedOrder?.id,
        relatedEntityType: selectedOrder ? 'ORDER' : undefined,
        relatedEntityId: selectedOrder?.id,
        initialMessage: newInitialMessage.trim(),
        attachments: modalAttachments.map((a) => a.url),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
      setShowNewModal(false);
      setNewSubject('');
      setNewInitialMessage('');
      setSelectedOrder(null);
      setModalAttachments([]);
      setModalUploadError(null);
      if (data?.conversation?.id) {
        setSelectedConversationId(data.conversation.id);
        joinConversation(data.conversation.id);
      }
    },
    onError: (err: any) => {
      setModalUploadError(err.response?.data?.message || err.message || 'Failed to create inquiry.');
    },
  });

  const conversations = convData?.conversations ?? [];
  const currentConv = detailData?.conversation;

  // Filter orders for searchable dropdown
  const filteredOrders = orders.filter((o: any) => {
    const q = orderSearch.toLowerCase();
    const num = (o.orderNumber || '').toLowerCase();
    const status = (o.status || '').toLowerCase();
    return num.includes(q) || status.includes(q);
  });

  const requiresOrder = [
    'Order Issue',
    'Delivery Issue',
    'Payment Issue',
    'Return/Refund',
  ].includes(inquiryCategory);

  return (
    <div className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] bg-[#07070a] text-white p-2.5 sm:p-4 md:p-6 flex flex-col overflow-hidden">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col min-h-0 space-y-2.5 sm:space-y-4">
        {/* Responsive Header: 2-row layout on mobile, single-row on desktop */}
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-2.5 sm:pb-3.5 gap-2">
          {/* Row 1 on mobile / Left group on desktop */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <Link
              href="/"
              className="h-9 w-9 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label="Back to home"
              title="Back to home"
            >
              <ArrowLeft className="h-4 w-4 text-white" />
            </Link>

            <div className="flex-1 min-w-0 px-1">
              <h1 className="text-sm sm:text-base md:text-lg font-bold flex items-center gap-1.5 min-w-0 text-white">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 shrink-0" />
                <span className="truncate">Customer Support &amp; Dispute Desk</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-white/50 truncate hidden sm:block">
                Direct messaging with marketplace trust &amp; customer care team.
              </p>
            </div>

            {/* Mobile-only New Inquiry button on the right of Row 1 */}
            <Button
              size="sm"
              onClick={() => setShowNewModal(true)}
              className="sm:hidden shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 px-2.5 rounded-xl gap-1 shadow-lg shadow-indigo-950/50"
              aria-label="Start new support inquiry"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New</span>
            </Button>
          </div>

          {/* Row 2 on mobile / Right group on desktop */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <p className="text-[11px] text-white/50 truncate sm:hidden flex-1 min-w-0 mr-1">
              Marketplace customer care
            </p>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <Badge
                variant="outline"
                className={`text-[10px] h-6 px-2 whitespace-nowrap shrink-0 ${
                  wsConnected
                    ? 'border-emerald-500/30 text-emerald-400'
                    : connectionState === 'reconnecting'
                    ? 'border-amber-500/30 text-amber-400'
                    : connectionState === 'connecting'
                    ? 'border-blue-500/30 text-blue-400'
                    : 'border-white/10 text-white/40'
                }`}
              >
                <Circle
                  className={`h-2 w-2 mr-1.5 fill-current shrink-0 ${
                    wsConnected
                      ? 'text-emerald-400'
                      : connectionState === 'reconnecting'
                      ? 'text-amber-400 animate-pulse'
                      : connectionState === 'connecting'
                      ? 'text-blue-400 animate-pulse'
                      : 'text-white/40'
                  }`}
                />
                {wsConnected ? (
                  <>
                    <span className="sm:hidden">Live</span>
                    <span className="hidden sm:inline">Live WebSocket Connected</span>
                  </>
                ) : connectionState === 'reconnecting' ? (
                  'Reconnecting...'
                ) : connectionState === 'connecting' ? (
                  'Connecting...'
                ) : (
                  <>
                    <span className="sm:hidden">Offline</span>
                    <span className="hidden sm:inline">Offline (Persistent Storage)</span>
                  </>
                )}
              </Badge>

              {!wsConnected && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reconnectSocket()}
                  className="text-[10px] h-6 px-2 border-white/10 text-white/70 hover:text-white shrink-0"
                >
                  <RefreshCw className="h-2.5 w-2.5 mr-1" />
                  Reconnect
                </Button>
              )}

              {/* Desktop-only Start New Inquiry button */}
              <Button
                size="sm"
                onClick={() => setShowNewModal(true)}
                className="hidden sm:flex bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-950/50 h-9 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> Start New Inquiry
              </Button>
            </div>
          </div>
        </div>

        {/* Two-Pane Chat Container: Single column toggle on mobile, side-by-side on md+ */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
          {/* Left Pane: Conversations */}
          <div
            className={`rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col min-h-0 overflow-hidden md:col-span-4 ${
              selectedConversationId ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="p-3 sm:p-3.5 border-b border-white/10 font-semibold text-xs text-white/70 flex items-center justify-between shrink-0">
              <span>Your Inquiries ({conversations.length})</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/5 overscroll-contain">
              {isConvLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <Skeleton className="h-14 w-full bg-white/5" />
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40 space-y-2.5 my-auto">
                  <HelpCircle className="h-8 w-8 text-white/10 mx-auto" />
                  <p>No support conversations yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNewModal(true)}
                    className="border-white/10 text-xs text-indigo-400 hover:text-white"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Open Support Inquiry
                  </Button>
                </div>
              ) : (
                conversations.map((c: any) => {
                  const isSelected = c.id === selectedConversationId;
                  const lastMsg = c.lastMessage || c.messages?.[0];
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConversationId(c.id)}
                      className={`p-3 sm:p-3.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-950/40 border-l-2 border-indigo-400'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                        <span className="font-semibold text-xs text-white truncate flex-1 min-w-0">
                          {c.subject}
                        </span>
                        <span className="text-[10px] text-white/40 shrink-0">
                          {new Date(c.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-white/50 min-w-0">
                        <span className="truncate flex-1 min-w-0">
                          {lastMsg ? lastMsg.message : 'No messages'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {c.unreadCount > 0 && (
                            <span className="h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center">
                              {c.unreadCount}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">
                            {c.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Active Chat Room */}
          <div
            className={`rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col min-h-0 overflow-hidden md:col-span-8 ${
              selectedConversationId ? 'flex' : 'hidden md:flex'
            }`}
          >
            {selectedConversationId && currentConv ? (
              <>
                {/* Conversation Header */}
                <div className="p-3 sm:p-3.5 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Mobile Back button to return to Inquiries list */}
                    <button
                      type="button"
                      onClick={() => setSelectedConversationId(null)}
                      className="md:hidden h-8 w-8 -ml-1 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white shrink-0 transition-colors"
                      aria-label="Back to inquiries list"
                      title="Back to inquiries list"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-white truncate">{currentConv.subject}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5 truncate">
                        <span className="shrink-0">Marketplace Support Desk</span>
                        {currentConv.relatedEntityType === 'ORDER' && currentConv.relatedEntityId && (
                          <>
                            <span className="shrink-0">·</span>
                            <span className="text-amber-400 flex items-center gap-1 font-mono shrink-0">
                              <Package className="h-3 w-3" /> Related Order
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 uppercase ml-2">
                    {currentConv.status}
                  </Badge>
                </div>

                {/* Messages Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 overscroll-contain">
                  {isDetailLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-3/4 bg-white/5 rounded-2xl" />
                      <Skeleton className="h-16 w-3/4 ml-auto bg-white/5 rounded-2xl" />
                      <Skeleton className="h-16 w-2/3 bg-white/5 rounded-2xl" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/40 space-y-2">
                      <HelpCircle className="h-8 w-8 text-white/10" />
                      <p className="text-xs">No messages in this inquiry yet.</p>
                    </div>
                  ) : (
                    messages.map((msg: any) => {
                      const isCustomer = msg.senderType === 'CUSTOMER';
                      return (
                        <div
                          key={msg.id || msg.clientMessageId}
                          className={`flex flex-col ${
                            isCustomer ? 'items-end' : 'items-start'
                          } max-w-full`}
                        >
                          <div
                            className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-3 text-xs shadow-sm space-y-2 break-words ${
                              isCustomer
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/10 text-white/95 border border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 font-semibold">
                              <span className="truncate">{isCustomer ? 'You' : msg.senderName || 'Support Team'}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span>
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {isCustomer && (
                                  msg.status === 'sending' ? (
                                    <span title="Sending..."><Loader2 className="h-3 w-3 text-indigo-200 animate-spin" /></span>
                                  ) : msg.status === 'failed' ? (
                                    <span title="Delivery failed"><AlertCircle className="h-3 w-3 text-rose-300" /></span>
                                  ) : (
                                    <span title="Delivered"><CheckCheck className="h-3 w-3 text-indigo-200" /></span>
                                  )
                                )}
                              </div>
                            </div>

                            {msg.message && <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.message}</p>}

                            {/* Attachments rendering */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-1.5 pt-1 border-t border-white/10">
                                {msg.attachments.map((attUrl: string, idx: number) => {
                                  const isImg = attUrl.match(/\.(jpeg|jpg|png|webp|avif)($|\?)/i);
                                  return isImg ? (
                                    <a
                                      key={idx}
                                      href={attUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block group relative rounded-lg overflow-hidden border border-white/20"
                                    >
                                      <img
                                        src={attUrl}
                                        alt="attachment"
                                        className="max-h-48 max-w-full rounded-lg object-cover hover:opacity-90 transition-opacity"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      key={idx}
                                      href={attUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2 rounded-lg bg-black/20 hover:bg-black/30 border border-white/10 text-[11px] text-white"
                                    >
                                      <FileText className="h-4 w-4 text-white/60 shrink-0" />
                                      <span className="truncate flex-1 min-w-0">Supporting Document</span>
                                      <ExternalLink className="h-3 w-3 text-white/40 shrink-0" />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Failed Message Banner with Retry */}
                  {failedMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                        <span className="truncate">Failed to deliver message</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleSendMessage(failedMessage.text, failedMessage.clientMessageId)
                        }
                        className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] h-7 px-2.5 gap-1 shrink-0"
                      >
                        <RefreshCw className="h-3 w-3" /> Retry
                      </Button>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Attachments preview tray */}
                {pendingAttachments.length > 0 && (
                  <div className="px-3 py-1.5 bg-black/40 border-t border-white/10 flex items-center gap-2 overflow-x-auto shrink-0">
                    {pendingAttachments.map((att, i) => (
                      <div
                        key={i}
                        className="h-8 px-2.5 rounded-lg bg-white/10 border border-white/10 flex items-center gap-1.5 text-xs text-white shrink-0"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => setPendingAttachments((p) => p.filter((_, idx) => idx !== i))}
                          className="text-white/40 hover:text-white ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Tray */}
                <div className="p-2.5 sm:p-3 border-t border-white/10 bg-black/30 flex items-center gap-2 shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
                  <input
                    type="file"
                    ref={attachmentInputRef}
                    onChange={handleAttachmentUpload}
                    multiple
                    className="hidden"
                    accept="image/*,application/pdf"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingAttachment}
                    onClick={() => attachmentInputRef.current?.click()}
                    title="Attach file or photo"
                    aria-label="Attach file or photo"
                    className="border-white/10 text-white/60 hover:text-white h-9 w-9 p-0 rounded-xl shrink-0"
                  >
                    {isUploadingAttachment ? (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>

                  <input
                    type="text"
                    placeholder="Type your message to support..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && (messageText.trim() || pendingAttachments.length > 0)) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs text-white bg-white/[0.05] border border-white/10 focus:outline-none focus:border-indigo-500 placeholder:text-white/40 h-9"
                  />

                  <Button
                    size="sm"
                    disabled={
                      (!messageText.trim() && pendingAttachments.length === 0) ||
                      isSending
                    }
                    onClick={() => handleSendMessage()}
                    aria-label="Send message"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-9 px-3 shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center text-white/40 space-y-2">
                <MessageSquare className="h-10 w-10 text-white/10" />
                <p className="text-xs">Select an inquiry or start a new message to chat with support.</p>
              </div>
            )}
          </div>
        </div>

        {/* START NEW SUPPORT INQUIRY MODAL (Full Feature Implementation) */}
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[calc(100dvh-3rem)] bg-[#0d0d14] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Start New Support Inquiry</h3>
                    <p className="text-[11px] text-white/50">
                      Reach marketplace administration for help with orders, delivery, or account.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {modalUploadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                    <span>{modalUploadError}</span>
                    <button onClick={() => setModalUploadError(null)}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* 1. Inquiry Category */}
                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">
                    Inquiry Category *
                  </label>
                  <select
                    value={inquiryCategory}
                    onChange={(e) => setInquiryCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Order Issue" className="bg-[#0d0d14]">Order Issue</option>
                    <option value="Delivery Issue" className="bg-[#0d0d14]">Delivery Issue</option>
                    <option value="Payment Issue" className="bg-[#0d0d14]">Payment Issue</option>
                    <option value="Return/Refund" className="bg-[#0d0d14]">Return / Refund Request</option>
                    <option value="Product Question" className="bg-[#0d0d14]">Product Question</option>
                    <option value="Seller/Shop Issue" className="bg-[#0d0d14]">Seller / Shop Issue</option>
                    <option value="Account Issue" className="bg-[#0d0d14]">Account Issue</option>
                    <option value="Other" className="bg-[#0d0d14]">Other</option>
                  </select>
                </div>

                {/* 2. Related Order Searchable Selector */}
                <div className="relative" ref={orderDropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-white/80">
                      Related Order {requiresOrder ? '*' : '(Optional)'}
                    </label>
                    {selectedOrder && (
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(null)}
                        className="text-[10px] text-white/40 hover:text-white"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOrderDropdownOpen(!isOrderDropdownOpen)}
                    className="w-full h-11 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white flex items-center justify-between hover:bg-white/[0.05] transition-colors text-left"
                  >
                    {selectedOrder ? (
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-indigo-300">
                          #{selectedOrder.orderNumber}
                        </span>
                        <span className="text-white/40">·</span>
                        <span className="text-white/70">
                          {new Date(selectedOrder.placedAt || selectedOrder.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-white/40">·</span>
                        <span className="text-white/90 font-medium">
                          ${Number(selectedOrder.grandTotal || 0).toFixed(2)}
                        </span>
                        <Badge variant="outline" className="text-[9px] ml-1 uppercase">
                          {selectedOrder.status}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-white/40">
                        {isOrdersLoading
                          ? 'Loading your orders...'
                          : requiresOrder
                          ? 'Select the affected order from your history...'
                          : 'Select an order (or leave empty for account inquiries)...'}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-white/40 transition-transform ${
                        isOrderDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isOrderDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-white/10 bg-[#12121c] p-2 shadow-2xl backdrop-blur-xl max-h-56 flex flex-col space-y-1">
                      <div className="relative mb-1">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
                        <input
                          type="text"
                          placeholder="Search your orders by #..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="w-full h-8 pl-8 pr-2 rounded-lg bg-white/[0.04] border border-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                        {isOrdersLoading ? (
                          <div className="p-4 text-center text-xs text-white/40">Loading orders...</div>
                        ) : filteredOrders.length === 0 ? (
                          <div className="p-4 text-center text-xs text-white/40">No matching orders found.</div>
                        ) : (
                          filteredOrders.map((ord: any) => {
                            const isCurrent = selectedOrder?.id === ord.id;
                            return (
                              <button
                                key={ord.id}
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setIsOrderDropdownOpen(false);
                                  if (!newSubject) {
                                    setNewSubject(`Inquiry regarding Order #${ord.orderNumber}`);
                                  }
                                }}
                                className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                                  isCurrent ? 'bg-indigo-600/30 text-white' : 'hover:bg-white/[0.04] text-white/80'
                                }`}
                              >
                                <div>
                                  <div className="font-mono font-bold text-indigo-300">#{ord.orderNumber}</div>
                                  <div className="text-[10px] text-white/40">
                                    {new Date(ord.placedAt || ord.createdAt).toLocaleDateString()} · $
                                    {Number(ord.grandTotal || 0).toFixed(2)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[9px]">
                                    {ord.status}
                                  </Badge>
                                  {isCurrent && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Subject Field */}
                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Delivery status delay / Question about refund"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full h-10 px-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 4. Message Field */}
                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">
                    Message Description *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Explain your inquiry in detail so the customer care team can assist you..."
                    value={newInitialMessage}
                    onChange={(e) => setNewInitialMessage(e.target.value)}
                    className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                {/* 5. Optional Supporting Attachments */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-white/80">
                      Supporting Files / Screenshots (Optional)
                    </label>
                    <span className="text-[10px] text-white/40">Max 10MB each</span>
                  </div>

                  <input
                    type="file"
                    ref={modalAttachmentInputRef}
                    onChange={handleModalAttachmentUpload}
                    multiple
                    className="hidden"
                    accept="image/*,application/pdf"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => modalAttachmentInputRef.current?.click()}
                    className="border-white/10 text-xs text-white/70 hover:text-white w-full h-9 border-dashed rounded-xl gap-2"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>Upload Supporting Files or Screenshots</span>
                  </Button>

                  {modalAttachments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {modalAttachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate max-w-[240px] text-white/80">{att.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setModalAttachments((p) => p.filter((_, i) => i !== idx))}
                            className="text-white/40 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-5 border-t border-white/10 flex items-center justify-end gap-2 shrink-0 bg-white/[0.02] pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:pb-5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewModal(false)}
                  className="border-white/10 text-xs text-white/70 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !newSubject.trim() ||
                    !newInitialMessage.trim() ||
                    (requiresOrder && !selectedOrder) ||
                    startConversationMutation.isPending
                  }
                  onClick={() => startConversationMutation.mutate()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 min-w-[130px]"
                >
                  {startConversationMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Submit Inquiry</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerSupportChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070a] p-6 flex items-center justify-center">
          <Skeleton className="h-48 w-full max-w-2xl bg-white/5" />
        </div>
      }
    >
      <SupportChatContent />
    </Suspense>
  );
}
