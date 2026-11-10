import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOnDemandChatSocket } from '../hooks/useOnDemandChatSocket';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  MessageSquare,
  Send,
  Circle,
  Plus,
  X,
  CheckCheck,
  Paperclip,
  AlertCircle,
  RefreshCw,
  FileText,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface Attachment {
  name: string;
  url: string;
  type: string;
}

interface SupportChatPageProps {
  navigation: any;
}

export function SupportChatPage({ navigation }: SupportChatPageProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newInitialMessage, setNewInitialMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [failedMessage, setFailedMessage] = useState<{ text: string; clientMessageId: string } | null>(null);

  const scrollViewRef = useRef<any>(null);
  const queryClient = useQueryClient();

  // On-demand WebSocket connection: exists ONLY while a conversation is open
  const { connectionState, reconnect: reconnectSocket } = useOnDemandChatSocket({
    role: 'seller',
    conversationId: selectedConversationId,
    onMessage: (payload) => {
      if (
        payload.type === 'new_message' ||
        payload.type === 'read_receipt' ||
        payload.type === 'conversation_status_updated'
      ) {
        queryClient.invalidateQueries({
          queryKey: ['seller-conversation-detail', selectedConversationId],
        });
        queryClient.invalidateQueries({
          queryKey: ['seller-support-conversations'],
        });
      }
    },
    onReconnect: () => {
      if (selectedConversationId) {
        queryClient.invalidateQueries({
          queryKey: ['seller-conversation-detail', selectedConversationId],
        });
        queryClient.invalidateQueries({
          queryKey: ['seller-support-conversations'],
        });
      }
    },
  });

  const wsConnected = connectionState === 'connected';

  // Load conversations list
  const { data: convData, isLoading: isConvLoading, refetch: refetchConversations } = useQuery({
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
    refetchInterval: wsConnected ? false : 5000,
  });

  const currentConv = detailData?.conversation;
  const messages = currentConv?.messages || detailData?.messages || [];

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (vars: { textOverride?: string; clientMessageId?: string } | void) => {
      const textToSend = (vars?.textOverride ?? messageText).trim();
      const attachmentsToSend = pendingAttachments.map((a) => a.url);

      if (!textToSend && attachmentsToSend.length === 0) return;

      const clientMessageId =
        vars?.clientMessageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const res = await axiosInstance.post(
        `/seller/api/conversations/${selectedConversationId}/messages`,
        {
          message: textToSend,
          attachments: attachmentsToSend,
          clientMessageId,
        }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['seller-conversation-detail', selectedConversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['seller-support-conversations'],
      });
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

  // Pick Image or Document attachment
  const handlePickAttachment = () => {
    Alert.alert(
      'Attach File',
      'Select attachment type',
      [
        {
          text: 'Photo from Gallery',
          onPress: pickImage,
        },
        {
          text: 'PDF Document',
          onPress: pickDocument,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadFile({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || `photo_${Date.now()}.jpg`,
          type: result.assets[0].mimeType || 'image/jpeg',
          isDoc: false,
        });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not pick image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        await uploadFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf',
          isDoc: true,
        });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not pick document');
    }
  };

  const uploadFile = async (fileObj: { uri: string; name: string; type: string; isDoc: boolean }) => {
    setIsUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append(fileObj.isDoc ? 'document' : 'image', {
        uri: fileObj.uri,
        name: fileObj.name,
        type: fileObj.type,
      } as any);
      formData.append('folder', 'support');

      const endpoint = fileObj.isDoc ? '/api/storage/document' : '/api/storage/image';
      const res = await axiosInstance.post(endpoint, formData);
      const url = res.data?.data?.url || res.data?.url;

      if (url) {
        setPendingAttachments((prev) => [
          ...prev,
          { name: fileObj.name, url, type: fileObj.type },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.response?.data?.message || err.message || 'Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // Start new ticket mutation
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
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Could not start ticket');
    },
  });

  const conversations = convData?.conversations ?? [];

  return (
    <DashboardLayout title="Support Chat" navigation={navigation} currentRoute="/support-chat">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {selectedConversationId && currentConv ? (
          /* ACTIVE CHAT VIEW */
          <View style={styles.chatContainer}>
            {/* Active Chat Header */}
            <View style={styles.activeChatHeader}>
              <TouchableOpacity
                onPress={() => setSelectedConversationId(null)}
                style={styles.backButton}
              >
                <ChevronLeft size={20} color="#ffffff" />
                <Text style={styles.backButtonText}>Tickets</Text>
              </TouchableOpacity>

              <View style={styles.activeTitleContainer}>
                <Text style={styles.activeChatTitle} numberOfLines={1}>
                  {currentConv.subject}
                </Text>
                <View style={styles.activeWsRow}>
                  <Circle
                    size={7}
                    color={wsConnected ? Colors.emerald : connectionState === 'reconnecting' ? Colors.yellow : 'rgba(255, 255, 255, 0.4)'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.activeChatSub}>
                    {wsConnected
                      ? 'Live WebSocket Connected'
                      : connectionState === 'reconnecting'
                      ? 'Reconnecting...'
                      : 'Marketplace Desk'}
                  </Text>
                </View>
              </View>

              <Badge variant="outline" style={{ borderColor: 'rgba(255, 255, 255, 0.15)' }}>
                {currentConv.status}
              </Badge>
            </View>

            {/* Messages Body */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {isDetailLoading ? (
                <View style={{ gap: 12, padding: 12 }}>
                  <Skeleton height={60} width="65%" style={{ alignSelf: 'flex-start' }} />
                  <Skeleton height={70} width="75%" style={{ alignSelf: 'flex-end' }} />
                  <Skeleton height={50} width="60%" style={{ alignSelf: 'flex-start' }} />
                </View>
              ) : messages.length === 0 ? (
                <View style={styles.emptyMessagesBox}>
                  <Text style={styles.emptyMessagesText}>No messages in this ticket yet.</Text>
                </View>
              ) : (
                messages.map((msg: any) => {
                  const isSeller = msg.senderType === 'SELLER';
                  return (
                    <View
                      key={msg.id || msg.clientMessageId}
                      style={[
                        styles.msgWrapper,
                        isSeller ? styles.msgWrapperRight : styles.msgWrapperLeft,
                      ]}
                    >
                      <View
                        style={[
                          styles.msgBubble,
                          isSeller ? styles.msgBubbleSeller : styles.msgBubbleAdmin,
                        ]}
                      >
                        <View style={styles.msgHeader}>
                          <Text style={styles.msgSenderName}>
                            {isSeller ? 'You' : msg.senderName || 'Marketplace Admin'}
                          </Text>
                          <View style={styles.msgMeta}>
                            <Text style={styles.msgTime}>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                            {isSeller && <CheckCheck size={12} color="#ddd6fe" />}
                          </View>
                        </View>

                        {msg.message ? (
                          <Text style={styles.msgText}>{msg.message}</Text>
                        ) : null}

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <View style={styles.msgAttachments}>
                            {msg.attachments.map((attUrl: string, idx: number) => {
                              const isImg = attUrl.match(/\.(jpeg|jpg|png|webp|avif)($|\?)/i);
                              return isImg ? (
                                <TouchableOpacity
                                  key={idx}
                                  onPress={() => Linking.openURL(attUrl)}
                                  activeOpacity={0.8}
                                  style={styles.imageAttachmentBox}
                                >
                                  <Image
                                    source={{ uri: attUrl }}
                                    style={styles.imageAttachment}
                                    resizeMode="cover"
                                  />
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  key={idx}
                                  onPress={() => Linking.openURL(attUrl)}
                                  style={styles.docAttachmentBox}
                                >
                                  <FileText size={16} color="rgba(255, 255, 255, 0.7)" />
                                  <Text style={styles.docAttachmentText} numberOfLines={1}>
                                    Supporting Document
                                  </Text>
                                  <ExternalLink size={12} color="rgba(255, 255, 255, 0.5)" />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}

              {/* Failed Message Alert */}
              {failedMessage && (
                <View style={styles.failedBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <AlertCircle size={14} color={Colors.rose} />
                    <Text style={styles.failedText} numberOfLines={1}>
                      Delivery failed: "{failedMessage.text}"
                    </Text>
                  </View>
                  <Button
                    size="sm"
                    variant="destructive"
                    onPress={() =>
                      sendMessageMutation.mutate({
                        textOverride: failedMessage.text,
                        clientMessageId: failedMessage.clientMessageId,
                      })
                    }
                    icon={<RefreshCw size={12} color="#ffffff" />}
                    style={{ height: 28, paddingHorizontal: 8 }}
                  >
                    Retry
                  </Button>
                </View>
              )}
            </ScrollView>

            {/* Pending Attachments Bar */}
            {pendingAttachments.length > 0 && (
              <View style={styles.pendingBar}>
                {pendingAttachments.map((att, i) => (
                  <View key={i} style={styles.pendingChip}>
                    <FileText size={12} color={Colors.purpleLight} />
                    <Text style={styles.pendingChipText} numberOfLines={1}>
                      {att.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setPendingAttachments((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <X size={12} color="rgba(255, 255, 255, 0.5)" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Input Footer */}
            <View style={styles.inputFooter}>
              <TouchableOpacity
                onPress={handlePickAttachment}
                disabled={isUploadingAttachment}
                style={styles.attachBtn}
              >
                {isUploadingAttachment ? (
                  <ActivityIndicator size="small" color={Colors.purpleLight} />
                ) : (
                  <Paperclip size={18} color="rgba(255, 255, 255, 0.7)" />
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.chatInput}
                placeholder="Type your message to administration..."
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                value={messageText}
                onChangeText={setMessageText}
                multiline
              />

              <TouchableOpacity
                onPress={() => sendMessageMutation.mutate()}
                disabled={
                  (!messageText.trim() && pendingAttachments.length === 0) ||
                  sendMessageMutation.isPending
                }
                style={[
                  styles.sendBtn,
                  (!messageText.trim() && pendingAttachments.length === 0) && styles.sendBtnDisabled,
                ]}
              >
                {sendMessageMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Send size={16} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* CONVERSATIONS LIST VIEW */
          <ScrollView
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={styles.headerIcon}>
                  <MessageSquare size={20} color={Colors.purpleLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Direct Marketplace Support</Text>
                  <Text style={styles.subtitle}>
                    Live messaging with marketplace administrators for statement inquiries, disputes, and compliance assistance.
                  </Text>
                </View>
              </View>

              <View style={styles.headerActionRow}>
                <Badge variant={wsConnected ? 'emerald' : 'outline'}>
                  <Circle
                    size={6}
                    color={wsConnected ? Colors.emerald : 'rgba(255, 255, 255, 0.4)'}
                    style={{ marginRight: 4 }}
                  />
                  {wsConnected ? 'WebSocket Online' : 'Standby / Storage'}
                </Badge>

                <Button
                  size="sm"
                  onPress={() => setShowNewModal(true)}
                  icon={<Plus size={14} color="#ffffff" />}
                >
                  New Ticket
                </Button>
              </View>
            </View>

            {/* Conversation Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Your Conversations ({conversations.length})
              </Text>

              {isConvLoading ? (
                <View style={{ gap: 10 }}>
                  <Skeleton height={74} />
                  <Skeleton height={74} />
                  <Skeleton height={74} />
                </View>
              ) : conversations.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <MessageSquare size={36} color="rgba(255, 255, 255, 0.2)" />
                  <Text style={styles.emptyText}>
                    No support conversations yet. Tap "New Ticket" to begin.
                  </Text>
                </Card>
              ) : (
                conversations.map((c: any) => {
                  const lastMsg = c.lastMessage || c.messages?.[0];
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setSelectedConversationId(c.id)}
                      activeOpacity={0.7}
                    >
                      <Card style={styles.ticketCard}>
                        <View style={styles.ticketHeader}>
                          <Text style={styles.ticketSubject} numberOfLines={1}>
                            {c.subject}
                          </Text>
                          <Text style={styles.ticketDate}>
                            {new Date(c.lastMessageAt || c.updatedAt).toLocaleDateString()}
                          </Text>
                        </View>

                        <View style={styles.ticketBottom}>
                          <Text style={styles.ticketLastMsg} numberOfLines={1}>
                            {lastMsg ? lastMsg.message : 'No messages yet'}
                          </Text>
                          <Badge variant="outline" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                            {c.status}
                          </Badge>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Start New Ticket Modal */}
      {showNewModal && (
        <Modal
          visible={showNewModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNewModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Start New Support Ticket</Text>
                <TouchableOpacity onPress={() => setShowNewModal(false)}>
                  <X size={18} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Subject / Inquiry Title *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Commission Statement Discrepancy"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    value={newSubject}
                    onChangeText={setNewSubject}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                    placeholder="Provide details regarding your inquiry for administration review..."
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    value={newInitialMessage}
                    onChangeText={setNewInitialMessage}
                    multiline
                  />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => setShowNewModal(false)}
                  style={{ flex: 1, marginRight: 8 }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!newSubject.trim() || !newInitialMessage.trim() || startConversationMutation.isPending}
                  onPress={() => startConversationMutation.mutate()}
                  style={{ flex: 1 }}
                >
                  {startConversationMutation.isPending ? 'Sending...' : 'Open Ticket'}
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
    lineHeight: 15,
  },
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 4,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
  ticketCard: {
    padding: 14,
    gap: 8,
    borderColor: Colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  ticketDate: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  ticketBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketLastMsg: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    flex: 1,
    marginRight: 12,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  activeChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    gap: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
  },
  backButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  activeTitleContainer: {
    flex: 1,
  },
  activeChatTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  activeWsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  activeChatSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 14,
    gap: 12,
  },
  emptyMessagesBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyMessagesText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  msgWrapper: {
    width: '100%',
  },
  msgWrapperRight: {
    alignItems: 'flex-end',
  },
  msgWrapperLeft: {
    alignItems: 'flex-start',
  },
  msgBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  msgBubbleSeller: {
    backgroundColor: '#7c3aed',
  },
  msgBubbleAdmin: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  msgSenderName: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  msgTime: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  msgText: {
    fontSize: 12,
    color: '#ffffff',
    lineHeight: 17,
  },
  msgAttachments: {
    gap: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 6,
  },
  imageAttachmentBox: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  imageAttachment: {
    width: 200,
    height: 140,
    borderRadius: 10,
  },
  docAttachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  docAttachmentText: {
    flex: 1,
    fontSize: 11,
    color: '#ffffff',
  },
  failedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  failedText: {
    fontSize: 11,
    color: Colors.rose,
  },
  pendingBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
  },
  pendingChipText: {
    fontSize: 10,
    color: '#ffffff',
    maxWidth: 100,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    gap: 8,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  chatInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#0d0d14',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalBody: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
});
