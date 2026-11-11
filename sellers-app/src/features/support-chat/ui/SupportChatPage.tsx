'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOnDemandChatSocket } from '../hooks/useOnDemandChatSocket';
import {
  MessageSquare,
  Send,
  Circle,
  Plus,
  X,
  CheckCheck,
  Paperclip,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface Attachment {
  name: string;
  url: string;
  type: string;
}

export function SupportChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newInitialMessage, setNewInitialMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [failedMessage, setFailedMessage] = useState<{ text: string; clientMessageId: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // On-demand WebSocket connection: exists ONLY while a conversation is open
  const { connectionState, reconnect: reconnectSocket } = useOnDemandChatSocket({
    role: 'seller',
    conversationId: selectedConversationId,
    onMessage: (payload) => {
      if (payload.type === 'new_message' || payload.type === 'read_receipt' || payload.type === 'conversation_status_updated') {
        queryClient.invalidateQueries({ queryKey: ['seller-conversation-detail', selectedConversationId] });
        queryClient.invalidateQueries({ queryKey: ['seller-support-conversations'] });
      }
    },
    onReconnect: () => {
      // Re-fetch persisted messages from DB upon reconnecting to recover any offline messages
      if (selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ['seller-conversation-detail', selectedConversationId] });
        queryClient.invalidateQueries({ queryKey: ['seller-support-conversations'] });
      }
    },
  });

  const wsConnected = connectionState === 'connected';

  // Load conversations list
  const { data: convData, isLoading: isConvLoading } = useQuery({
    queryKey: ['seller-support-conversations'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/conversations');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // Load detail for selected conversation
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['seller-conversation-detail', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const res = await axiosInstance.get(`/seller/api/conversations/${selectedConversationId}`);
      return res.data;
    },
    enabled: !!selectedConversationId,
    refetchInterval: wsConnected ? false : 5000, // Background sync when WS disconnected
  });

  // Messages array (reading from both detailData.conversation.messages and detailData.messages safely)
  const currentConv = detailData?.conversation;
  const messages = currentConv?.messages || detailData?.messages || [];

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (vars: { textOverride?: string; clientMessageId?: string } | void) => {
      const textToSend = (vars?.textOverride ?? messageText).trim();
      const attachmentsToSend = pendingAttachments.map((a) => a.url);

      if (!textToSend && attachmentsToSend.length === 0) return;

      const clientMessageId = vars?.clientMessageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const res = await axiosInstance.post(`/seller/api/conversations/${selectedConversationId}/messages`, {
        message: textToSend,
        attachments: attachmentsToSend,
        clientMessageId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-conversation-detail', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['seller-support-conversations'] });
      setMessageText('');
      setPendingAttachments([]);
      setFailedMessage(null);
    },
    onError: (_err, vars) => {
      const textToSave = (vars?.textOverride ?? messageText).trim();
      setFailedMessage({
        text: textToSave,
        clientMessageId: vars?.clientMessageId || `msg_${Date.now()}_failed`,
      });
    },
  });

  // Handle uploading attachments in chat
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        const isDoc = file.type === 'application/pdf';
        formData.append(isDoc ? 'document' : 'image', file);
        formData.append('folder', 'support');

        const endpoint = isDoc ? '/api/storage/document' : '/api/storage/image';
        const res = await axiosInstance.post(endpoint, formData);
        const url = res.data?.data?.url || res.data?.url;

        if (url) {
          setPendingAttachments((prev) => [
            ...prev,
            { name: file.name, url, type: file.type },
          ]);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  // Start new conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async () => {
      if (!newSubject.trim() || !newInitialMessage.trim()) return;
      const res = await axiosInstance.post('/seller/api/conversations', {
        subject: newSubject.trim(),
        initialMessage: newInitialMessage.trim(),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seller-support-conversations'] });
      setShowNewModal(false);
      setNewSubject('');
      setNewInitialMessage('');
      if (data?.conversation?.id) {
        setSelectedConversationId(data.conversation.id);
      }
    },
  });

  const conversations = convData?.conversations ?? [];

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-9rem)] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-400" />
              Direct Marketplace Support &amp; Helpdesk
            </h1>
            <p className="text-xs text-white/50">
              Live messaging with marketplace administrators for statement inquiries, disputes, and compliance assistance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : connectionState === 'reconnecting'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800 text-slate-400'
            }>
              <Circle className={`h-2 w-2 mr-1.5 fill-current ${
                wsConnected
                  ? 'text-emerald-400'
                  : connectionState === 'reconnecting'
                  ? 'text-amber-400 animate-pulse'
                  : 'text-slate-500'
              }`} />
              {selectedConversationId
                ? wsConnected
                  ? 'Live WebSocket Connected'
                  : connectionState === 'reconnecting'
                  ? 'Reconnecting...'
                  : connectionState === 'connecting'
                  ? 'Connecting...'
                  : 'Persistent Storage'
                : 'Standby (Chat Closed)'}
            </Badge>
            {selectedConversationId && connectionState === 'offline' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => reconnectSocket()}
                className="text-[10px] h-6 px-2 border-white/10 text-white/50 hover:text-white"
              >
                Reconnect
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowNewModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> New Ticket
            </Button>
          </div>
        </div>

        {/* Chat Two-Pane Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
          {/* Left Pane: Conversations */}
          <Card className="md:col-span-4 border border-white/5 bg-white/[0.02] flex flex-col min-h-0 overflow-hidden">
            <div className="p-3 border-b border-white/5 font-semibold text-xs text-white/70">
              Your Conversations
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {isConvLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40">
                  No support conversations yet. Click "New Ticket" to begin.
                </div>
              ) : (
                conversations.map((c: any) => {
                  const isSelected = c.id === selectedConversationId;
                  const lastMsg = c.lastMessage || c.messages?.[0];
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConversationId(c.id)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-purple-950/30 border-l-2 border-purple-400' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-white truncate max-w-[170px]">{c.subject}</span>
                        <span className="text-[10px] text-white/40">
                          {new Date(c.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/50">
                        <span className="truncate max-w-[180px]">
                          {lastMsg ? lastMsg.message : 'No messages'}
                        </span>
                        <Badge className="text-[9px] bg-white/5 border-white/10 text-white/60">
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Right Pane: Active Messages */}
          <Card className="md:col-span-8 border border-white/5 bg-white/[0.02] flex flex-col min-h-0 overflow-hidden">
            {selectedConversationId && currentConv ? (
              <>
                {/* Header */}
                <div className="p-3.5 border-b border-white/5 flex items-center justify-between bg-black/20">
                  <div>
                    <h3 className="font-bold text-xs text-white">{currentConv.subject}</h3>
                    <span className="text-[10px] text-white/40">Marketplace Administration Desk</span>
                  </div>
                  <Badge className="text-[10px] bg-white/5 border-white/10 text-white/60">
                    Status: {currentConv.status}
                  </Badge>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isDetailLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    messages.map((msg: any) => {
                      const isSeller = msg.senderType === 'SELLER';
                      return (
                        <div
                          key={msg.id || msg.clientMessageId}
                          className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'} max-w-full`}
                        >
                          <div
                            className={`max-w-[75%] rounded-xl p-3 text-xs shadow-sm space-y-2 ${
                              isSeller
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-white/90 border border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 font-semibold">
                              <span>{isSeller ? 'You' : msg.senderName || 'Marketplace Admin'}</span>
                              <div className="flex items-center gap-1">
                                <span>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isSeller && <CheckCheck className="h-3 w-3 text-purple-200" />}
                              </div>
                            </div>

                            {msg.message && <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>}

                            {/* Attachments */}
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
                                      className="block rounded-lg overflow-hidden border border-white/20"
                                    >
                                      <img
                                        src={attUrl}
                                        alt="attachment"
                                        className="max-h-48 rounded-lg object-cover hover:opacity-90 transition-opacity"
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
                                      <FileText className="h-4 w-4 text-white/60" />
                                      <span className="truncate flex-1">Supporting Document</span>
                                      <ExternalLink className="h-3 w-3 text-white/40" />
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
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                        <span>Failed to deliver message: "{failedMessage.text}"</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          sendMessageMutation.mutate({
                            textOverride: failedMessage.text,
                            clientMessageId: failedMessage.clientMessageId,
                          })
                        }
                        className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] h-7 gap-1"
                      >
                        <RefreshCw className="h-3 w-3" /> Retry
                      </Button>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Attachments preview tray */}
                {pendingAttachments.length > 0 && (
                  <div className="px-3 pt-2 bg-black/40 border-t border-white/10 flex items-center gap-2 overflow-x-auto">
                    {pendingAttachments.map((att, i) => (
                      <div
                        key={i}
                        className="h-8 px-2.5 rounded-lg bg-white/10 border border-white/10 flex items-center gap-1.5 text-xs text-white"
                      >
                        <FileText className="h-3.5 w-3.5 text-purple-400" />
                        <span className="truncate max-w-[120px]">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => setPendingAttachments((p) => p.filter((_, idx) => idx !== i))}
                          className="text-white/40 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="p-3 border-t border-white/5 bg-black/20 flex items-center gap-2">
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
                    title="Attach file or document"
                    className="border-white/10 text-white/60 hover:text-white h-9 w-9 p-0 rounded-xl shrink-0"
                  >
                    {isUploadingAttachment ? (
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>

                  <input
                    type="text"
                    placeholder="Type your message to administration..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && (messageText.trim() || pendingAttachments.length > 0)) {
                        e.preventDefault();
                        sendMessageMutation.mutate();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-xs text-white bg-white/[0.04] border border-white/10 focus:outline-none focus:border-purple-500"
                  />
                  <Button
                    size="sm"
                    disabled={
                      (!messageText.trim() && pendingAttachments.length === 0) ||
                      sendMessageMutation.isPending
                    }
                    onClick={() => sendMessageMutation.mutate()}
                    className="bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/40 space-y-2">
                <MessageSquare className="h-10 w-10 text-white/10" />
                <p className="text-xs">Select a conversation or start a new ticket to reach administrators.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Start New Ticket Modal */}
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="max-w-md w-full bg-[#0d0d14] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-sm text-white">Start New Support Ticket</h3>
                <button onClick={() => setShowNewModal(false)} className="text-white/40 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">Subject / Inquiry Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Commission Statement Discrepancy / Payout Inquiry"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">Description *</label>
                  <textarea
                    rows={4}
                    placeholder="Provide details regarding your inquiry for administration review..."
                    value={newInitialMessage}
                    onChange={(e) => setNewInitialMessage(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <Button size="sm" variant="outline" onClick={() => setShowNewModal(false)} className="border-white/10 text-xs text-white/70">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!newSubject.trim() || !newInitialMessage.trim() || startConversationMutation.isPending}
                  onClick={() => startConversationMutation.mutate()}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  {startConversationMutation.isPending ? 'Sending...' : 'Open Ticket'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
