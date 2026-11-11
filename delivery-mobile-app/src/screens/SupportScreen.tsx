import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Headphones, Phone, Send } from "lucide-react-native";
import { apiClient, getErrorMessage, TOKEN_KEY } from "../api";
import { Button, Card, Field, Loading, Page, Screen, Title } from "../components/ui";
import { colors } from "../theme";

type ChatMessage = {
  id: string;
  senderType: "DELIVERY_PARTNER" | "ADMIN" | "DISPATCH";
  senderName?: string;
  message: string;
  createdAt: string;
};

const quickPrompts = [
  "I need address clarification for current order",
  "Customer phone is unreachable",
  "Store has a delay in packing order",
  "Damage or leak issue with items",
];

export function SupportScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  const fetchConversation = useCallback(async () => {
    try {
      const { data: listData } = await apiClient.get("/api/delivery/conversations");
      let conversation = Array.isArray(listData?.conversations)
        ? listData.conversations.find((item: { status?: string }) => item.status !== "RESOLVED") || listData.conversations[0]
        : null;
      if (!conversation) {
        const { data: createdData } = await apiClient.post("/api/delivery/conversations", {
          subject: "Delivery Support Inquiry",
        });
        conversation = createdData?.conversation;
      }
      if (conversation) {
        setConversationId(String(conversation.id));
        const { data: messagesData } = await apiClient.get(`/api/delivery/conversations/${conversation.id}/messages`);
        setMessages(Array.isArray(messagesData?.messages) ? messagesData.messages as ChatMessage[] : []);
      }
      setError("");
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not load your support conversation."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchConversation(); }, [fetchConversation]);

  useEffect(() => {
    if (!conversationId) return;
    const rawWsUrl = process.env.EXPO_PUBLIC_WS_URL?.trim();
    if (!rawWsUrl) {
      setError("Set EXPO_PUBLIC_WS_URL in .env to enable live dispatch chat.");
      return;
    }
    let active = true;
    let socket: WebSocket | null = null;
    const connect = async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!active) return;
      if (!token) {
        setError("Your rider session has expired. Sign in again to use live support.");
        return;
      }
      const separator = rawWsUrl.includes("?") ? "&" : "?";
      socket = new WebSocket(`${rawWsUrl}${separator}role=rider`);
      socketRef.current = socket;
      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "auth", token, role: "rider" }));
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as {
            type?: string;
            message?: ChatMessage | string;
          };
          if (data.type === "auth_success") {
            setConnected(true);
          } else if (data.type === "auth_required") {
            setError(typeof data.message === "string" ? data.message : "Live support authentication is required.");
          } else if (data.type === "error") {
            setError(typeof data.message === "string" ? data.message : "The support service rejected your message.");
            setSending(false);
          } else if ((data.type === "new_message" || data.type === "NEW_MESSAGE" || data.type === "message_ack") && data.message) {
            const message = data.message as ChatMessage;
            setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
            if (data.type === "message_ack") setSending(false);
          }
        } catch (cause) {
          console.error("Could not read the support chat update.", cause);
        }
      };
      socket.onerror = (event) => {
        console.error("Dispatch support WebSocket encountered an error.", event);
        setConnected(false);
      };
      socket.onclose = () => setConnected(false);
    };
    void connect().catch((cause: unknown) => setError(getErrorMessage(cause, "Could not connect to live support.")));
    return () => {
      active = false;
      if (socket) {
        socket.close();
      }
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [conversationId]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      if (!conversationId) throw new Error("A support conversation is not available yet.");
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !connected) {
        throw new Error("Live dispatch is offline. Wait for the support connection and try again.");
      }
      socket.send(JSON.stringify({
        type: "send_message",
        conversationId,
        message: text,
        clientMessageId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      }));
      setInput("");
      setSending(false);
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not send this message."));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loading label="Connecting to support..." />;

  return (
    <Screen>
      <Page contentContainerStyle={styles.page}>
        <View style={styles.connection}>
          <View style={[styles.dot, connected && styles.dotConnected]} />
          <Text style={styles.connectionText}>{connected ? "Live Dispatch Connected" : "Live Dispatch Offline"}</Text>
        </View>
        <Card style={styles.supportHeader}>
          <View style={styles.headset}><Headphones size={20} color={colors.foreground} /></View>
          <View style={{ flex: 1 }}>
            <Title subtitle="Rider Support & Priority Help Desk">AtlasBasket Delivery Support</Title>
          </View>
          <Pressable accessibilityLabel="Call support helpline" onPress={() => void Linking.openURL("tel:+918210000000")} style={styles.call}>
            <Phone size={15} color={colors.foreground} />
          </Pressable>
        </Card>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Card style={styles.chat}>
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <Headphones size={22} color={colors.subtle} />
              <Text style={styles.emptyTitle}>How can we assist you today?</Text>
              <Text style={styles.emptyText}>Send a message or choose a common topic. A support specialist is ready to help.</Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              inverted
              contentContainerStyle={styles.messageList}
              renderItem={({ item }) => <MessageBubble message={item} />}
              showsVerticalScrollIndicator={false}
            />
          )}
          {messages.length === 0 ? (
            <View style={styles.prompts}>
              {quickPrompts.map((prompt) => (
                <Pressable key={prompt} onPress={() => setInput(prompt)} style={styles.prompt}>
                  <Text style={styles.promptText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.composer}>
            <Field label="Message dispatch" value={input} onChangeText={setInput} placeholder="Type your message..." multiline />
            <Button title="Send" onPress={() => void send()} loading={sending} disabled={!input.trim() || !connected} icon={<Send size={14} color={colors.black} />} />
          </View>
        </Card>
      </Page>
    </Screen>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.senderType === "DELIVERY_PARTNER";
  return (
    <View style={[styles.bubbleWrap, mine ? styles.mine : styles.theirs]}>
      <Text style={styles.sender}>{mine ? "You" : message.senderName || "Dispatch Manager"}</Text>
      <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble]}>
        <Text style={[styles.messageText, mine && styles.mineText]}>{message.message}</Text>
        <Text style={[styles.time, mine && styles.mineTime]}>{new Date(message.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, gap: 12, paddingBottom: 16 },
  connection: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#52525b" },
  dotConnected: { backgroundColor: colors.green },
  connectionText: { color: colors.muted, fontSize: 9 },
  supportHeader: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  headset: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.cardStrong, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  call: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.cardStrong, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  error: { color: colors.red, backgroundColor: colors.redBg, padding: 10, borderRadius: 11, fontSize: 10, lineHeight: 15 },
  chat: { flex: 1, gap: 12, padding: 13, minHeight: 300 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 8 },
  emptyTitle: { color: colors.foreground, fontSize: 13, fontWeight: "700", textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: "center" },
  prompts: { gap: 7, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  prompt: { alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card },
  promptText: { color: "#d4d4d8", fontSize: 9 },
  composer: { gap: 9, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  messageList: { gap: 13, justifyContent: "flex-end", flexGrow: 1 },
  bubbleWrap: { maxWidth: "87%", gap: 4 },
  mine: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  sender: { color: colors.subtle, fontSize: 8, paddingHorizontal: 4 },
  bubble: { borderRadius: 15, padding: 11, gap: 5, borderWidth: 1 },
  mineBubble: { backgroundColor: colors.white, borderColor: colors.white, borderTopRightRadius: 4 },
  theirBubble: { backgroundColor: colors.cardStrong, borderColor: colors.borderStrong, borderTopLeftRadius: 4 },
  messageText: { color: colors.foreground, fontSize: 11, lineHeight: 16 },
  mineText: { color: colors.black },
  time: { color: colors.subtle, fontSize: 8, textAlign: "right" },
  mineTime: { color: "#52525b" },
});
