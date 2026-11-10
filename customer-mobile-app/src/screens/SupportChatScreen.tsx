import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Plus,
  X,
  Circle,
} from 'lucide-react-native';
import { chatService, Conversation, ChatMessage } from '../services/chat.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const SupportChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const initialOrderId = route.params?.orderId;
  const initialCategory = route.params?.category;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // New Ticket Modal State
  const [showModal, setShowModal] = useState(!!initialOrderId);
  const [newSubject, setNewSubject] = useState(
    initialOrderId ? `Issue with Order #${initialOrderId}` : ''
  );
  const [newInitialMsg, setNewInitialMsg] = useState('');
  const [inquiryCategory, setInquiryCategory] = useState(
    initialCategory || (initialOrderId ? 'Order Issue' : 'General Question')
  );

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const convs = await chatService.getConversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConvId) {
        setActiveConvId(convs[0].id);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      chatService
        .getConversationMessages(activeConvId)
        .then(setMessages)
        .catch(() => {});
    }
  }, [activeConvId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConvId) return;

    const text = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      const sentMsg = await chatService.sendMessage(activeConvId, text);
      setMessages((prev) => [...prev, sentMsg]);
    } catch (err: any) {
      Alert.alert('Send Error', err.message || 'Could not deliver message');
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!newSubject.trim() || !newInitialMsg.trim()) {
      Alert.alert('Missing info', 'Please enter a subject and your inquiry message.');
      return;
    }

    try {
      const newConv = await chatService.createConversation({
        subject: newSubject.trim(),
        initialMessage: newInitialMsg.trim(),
        category: inquiryCategory,
        orderId: initialOrderId,
      });
      setShowModal(false);
      setNewSubject('');
      setNewInitialMsg('');
      await loadConversations();
      setActiveConvId(newConv.id);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not start conversation');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Customer Support Desk</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Plus size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Conversations tabs if multiple */}
      {conversations.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.convTabs}
        >
          {conversations.map((c) => {
            const isSelected = activeConvId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setActiveConvId(c.id)}
                style={[styles.convPill, isSelected && styles.convPillActive]}
              >
                <Text
                  style={[styles.convPillText, isSelected && styles.convPillTextActive]}
                  numberOfLines={1}
                >
                  {c.subject || 'Support Ticket'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Messages Feed */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.messagesScroll}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : messages.length > 0 ? (
          messages.map((msg) => {
            const isCustomer = msg.senderType === 'CUSTOMER';
            return (
              <View
                key={msg.id}
                style={[styles.bubbleWrap, isCustomer ? styles.bubbleCustomer : styles.bubbleAgent]}
              >
                <View
                  style={[
                    styles.bubble,
                    isCustomer ? styles.bubbleBgCustomer : styles.bubbleBgAgent,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      isCustomer ? styles.bubbleTextCustomer : styles.bubbleTextAgent,
                    ]}
                  >
                    {msg.message}
                  </Text>
                </View>
                <Text style={styles.bubbleTime}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <MessageSquare size={44} color={colors.foregroundDim} />
            <Text style={styles.emptyTitle}>Support Chat</Text>
            <Text style={styles.emptySub}>
              Have questions regarding an order, payment, or delivery? Tap + above to ask our support team.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Input */}
      {activeConvId && (
        <View style={styles.inputBar}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type your message..."
            placeholderTextColor={colors.foregroundDim}
            style={styles.chatInput}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={isSending || !messageText.trim()}
            style={styles.sendBtn}
          >
            <Send size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      )}

      {/* New Inquiry Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Support Inquiry</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 6 }}>
                <X size={20} color={colors.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                value={newSubject}
                onChangeText={setNewSubject}
                placeholder="Brief summary of inquiry"
                placeholderTextColor={colors.foregroundDim}
                style={styles.input}
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.catPillsRow}>
                {['General Question', 'Order Issue', 'Payment Query', 'Delivery'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setInquiryCategory(cat)}
                    style={[
                      styles.categoryOption,
                      inquiryCategory === cat && styles.categoryOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        inquiryCategory === cat && styles.categoryOptionTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Initial Message</Text>
              <TextInput
                value={newInitialMsg}
                onChangeText={setNewInitialMsg}
                placeholder="Explain what you need assistance with..."
                placeholderTextColor={colors.foregroundDim}
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                multiline
              />

              <TouchableOpacity
                onPress={handleCreateConversation}
                style={styles.startInquiryBtn}
              >
                <Text style={styles.startInquiryText}>Start Conversation</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  backBtn: {
    padding: 6,
  },
  topNavTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  addBtn: {
    padding: 6,
  },
  convTabs: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  convPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    maxWidth: 160,
  },
  convPillActive: {
    backgroundColor: colors.primary,
  },
  convPillText: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  convPillTextActive: {
    color: colors.primaryForeground,
  },
  messagesScroll: {
    padding: 16,
    paddingBottom: 80,
    gap: 12,
  },
  bubbleWrap: {
    maxWidth: '80%',
    gap: 2,
  },
  bubbleCustomer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleAgent: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleBgCustomer: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBgAgent: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextCustomer: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  bubbleTextAgent: {
    color: colors.foreground,
  },
  bubbleTime: {
    color: colors.foregroundDim,
    fontSize: 9,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 10,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: colors.foregroundMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  inputBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 24,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    gap: 10,
  },
  chatInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.glassInputBg,
    borderWidth: 1,
    borderColor: colors.glassInputBorder,
    paddingHorizontal: 14,
    color: colors.foreground,
    fontSize: 13,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  label: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 12,
    backgroundColor: colors.glassInputBg,
    borderWidth: 1,
    borderColor: colors.glassInputBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 13,
  },
  catPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  categoryOptionTextActive: {
    color: colors.primaryForeground,
  },
  startInquiryBtn: {
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startInquiryText: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontWeight: '800',
  },
});
