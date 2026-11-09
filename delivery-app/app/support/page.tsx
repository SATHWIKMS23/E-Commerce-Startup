"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  MessageSquare,
  Send,
  Phone,
  ArrowLeft,
  Headphones,
  CheckCheck,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

interface MessageItem {
  id: string;
  senderType: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export default function SupportChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await apiClient.get("/api/delivery/conversations");
      if (res.data?.conversations && res.data.conversations.length > 0) {
        setConversations(res.data.conversations);
        if (!activeConvId) {
          setActiveConvId(res.data.conversations[0].id);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await apiClient.get(`/api/delivery/conversations/${convId}/messages`);
      if (res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch {}
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      const poll = setInterval(() => fetchMessages(activeConvId), 4000);
      return () => clearInterval(poll);
    }
  }, [activeConvId]);

  // Connect persistent WebSocket
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("delivery_partner_token");
    if (!token) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, "")
      : window.location.hostname + ":5000";

    const wsUrl = `${wsProtocol}//${host}/ws/chat?token=${encodeURIComponent(
      token
    )}&roleHint=delivery_partner`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        if (activeConvId) {
          ws.send(
            JSON.stringify({
              type: "JOIN_ROOM",
              conversationId: activeConvId,
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "NEW_MESSAGE" && data.message) {
            setMessages((prev) => [...prev, data.message]);
          }
        } catch {}
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText;
    setInputText("");
    setSending(true);

    try {
      if (!activeConvId) {
        // Create conversation
        const res = await apiClient.post("/api/delivery/conversations", {
          subject: "Rider Support Inquiry",
          initialMessage: text,
        });
        if (res.data?.conversation) {
          setActiveConvId(res.data.conversation.id);
          await fetchConversations();
          await fetchMessages(res.data.conversation.id);
        }
      } else {
        // Send via WebSocket if open
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              conversationId: activeConvId,
              message: text,
            })
          );
        }
        // Send via fallback API
        await apiClient.post("/api/delivery/conversations", {
          deliveryId: undefined,
          initialMessage: text,
        }).catch(() => {});

        await fetchMessages(activeConvId);
      }
    } catch {
      // Restore on failure
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    "Customer phone is switched off",
    "Customer address is incorrect",
    "Merchant is taking too long to prepare package",
    "Payout question regarding recent completed delivery",
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-8 flex flex-col">
      <Navbar />

      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 pt-6 flex-1 flex flex-col space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? "bg-emerald-400 animate-ping" : "bg-amber-400"
              }`}
            />
            <span className="text-xs text-slate-400">
              {wsConnected ? "Live Dispatch Connected" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Support Card Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">AtlasBasket Dispatch Operations</h1>
              <p className="text-xs text-slate-400">Mysuru Rider Fleet Assistance & Priority Desk</p>
            </div>
          </div>

          <a
            href="tel:+918210000000"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Call Helpline</span>
          </a>
        </div>

        {/* Chat Messages Container */}
        <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 flex flex-col justify-between min-h-[420px] shadow-2xl relative overflow-hidden">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 max-h-[440px]">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Connecting to support...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-white">How can we assist you today?</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Send a message below or tap one of the common topics. A Mysuru fleet manager is on standby.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isRider = m.senderType === "DELIVERY_PARTNER";

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isRider ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-slate-500 mb-1 px-1">
                      {isRider ? "You" : m.senderName || "Dispatch Manager"}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                        isRider
                          ? "bg-emerald-500 text-slate-950 font-medium rounded-tr-sm"
                          : "bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/80"
                      }`}
                    >
                      <p>{m.message}</p>
                      <span
                        className={`block text-[9px] mt-1 text-right font-mono ${
                          isRider ? "text-slate-800" : "text-slate-400"
                        }`}
                      >
                        {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions pills */}
          {messages.length === 0 && (
            <div className="py-3 flex flex-wrap gap-2 border-t border-slate-800/80">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInputText(q)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Message Input form */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message to dispatch..."
              className="flex-1 py-3 px-4 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
