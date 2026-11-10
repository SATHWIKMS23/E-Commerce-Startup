"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  MessageSquare,
  ArrowLeft,
  Send,
  Phone,
  Headphones,
  CheckCircle2,
  Clock,
  Radio,
} from "lucide-react";

interface ChatMessage {
  id: string;
  senderType: "DELIVERY_PARTNER" | "ADMIN" | "DISPATCH";
  senderName?: string;
  message: string;
  createdAt: string;
}

export default function SupportPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const token = localStorage.getItem("delivery_partner_token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchOrCreateConversation();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchOrCreateConversation = async () => {
    try {
      const res = await apiClient.get("/api/delivery/support/conversation");
      if (res.data?.conversation) {
        setConversationId(res.data.conversation.id);
        setMessages(res.data.conversation.messages || []);
        connectWebSocket(res.data.conversation.id);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = (convId: string) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";
    try {
      const socket = new WebSocket(`${wsUrl}?conversationId=${convId}&role=DELIVERY_PARTNER`);

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "NEW_MESSAGE" && data.message) {
            setMessages((prev) => [...prev, data.message]);
          }
        } catch {}
      };

      socket.onclose = () => {
        setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const res = await apiClient.post("/api/delivery/support/messages", {
        conversationId,
        message: messageText,
      });

      if (res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
      }
    } catch {
      // Revert in case of failure
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    "I need address clarification for current order",
    "Customer phone is unreachable",
    "Store has a delay in packing order",
    "Damage or leak issue with items",
  ];

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 pb-24 md:pb-8 flex flex-col relative overflow-hidden">
      {/* Subtle monochrome ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-white/[0.025] blur-[140px] pointer-events-none rounded-full" />

      <Navbar />

      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 pt-6 flex-1 flex flex-col space-y-4 relative z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? "bg-white animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span className="text-xs text-zinc-400">
              {wsConnected ? "Live Dispatch Connected" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Support Card Header */}
        <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-4 sm:p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white">AtlasBasket Dispatch Operations</h1>
              <p className="text-xs text-zinc-400">Mysuru Rider Fleet Assistance & Priority Desk</p>
            </div>
          </div>

          <a
            href="tel:+918210000000"
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-white border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Phone className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Call Helpline</span>
          </a>
        </div>

        {/* Chat Messages Container */}
        <div className="flex-1 bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-4 sm:p-6 flex flex-col justify-between min-h-[420px] shadow-2xl relative overflow-hidden space-y-4">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 max-h-[440px]">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-xs">Connecting to support...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-sm font-semibold text-white">How can we assist you today?</p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
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
                    <span className="text-[10px] text-zinc-500 mb-1 px-1">
                      {isRider ? "You" : m.senderName || "Dispatch Manager"}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                        isRider
                          ? "bg-white text-zinc-950 font-medium rounded-tr-sm shadow-sm"
                          : "bg-white/[0.04] text-zinc-100 rounded-tl-sm border border-white/10"
                      }`}
                    >
                      <p>{m.message}</p>
                      <span
                        className={`block text-[9px] mt-1 text-right font-mono ${
                          isRider ? "text-zinc-600" : "text-zinc-400"
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
            <div className="py-3 flex flex-wrap gap-2 border-t border-white/[0.06]">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInputText(q)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.06] text-[11px] text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Message Input form */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t border-white/[0.06] flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message to dispatch..."
              className="flex-1 py-2.5 px-4 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-sm text-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
