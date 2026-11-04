"use client";

import { useEffect, useRef } from "react";
import { useChatSocket, ConnectionState as PersistentConnectionState } from "../context/ChatSocketContext";

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "offline";

export interface OnDemandSocketOptions {
  role: "customer" | "seller" | "admin";
  conversationId: string | null;
  onMessage?: (payload: any) => void;
  onReconnect?: () => void;
}

export function useOnDemandChatSocket({
  role: _role,
  conversationId,
  onMessage,
  onReconnect,
}: OnDemandSocketOptions) {
  const {
    connectionState: persistentState,
    isConnected,
    joinConversation,
    leaveConversation,
    reconnect,
    subscribeEventListener,
  } = useChatSocket();

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;
  const prevConnectedRef = useRef(isConnected);

  // Manage room subscription for the selected conversation without closing the global persistent socket
  useEffect(() => {
    if (!conversationId) return;

    joinConversation(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation]);

  // Subscribe to real-time events from the persistent connection
  useEffect(() => {
    const unsubscribe = subscribeEventListener((payload) => {
      if (onMessageRef.current) {
        onMessageRef.current(payload);
      }
    });
    return unsubscribe;
  }, [subscribeEventListener]);

  // Trigger onReconnect callback when connection transitions from offline/reconnecting to connected
  useEffect(() => {
    if (!prevConnectedRef.current && isConnected) {
      if (onReconnectRef.current) {
        onReconnectRef.current();
      }
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);

  // Map persistent connection state to legacy connection state
  const mappedState: ConnectionState =
    !conversationId
      ? "idle"
      : persistentState === "connected"
      ? "connected"
      : persistentState === "reconnecting"
      ? "reconnecting"
      : persistentState === "connecting"
      ? "connecting"
      : "offline";

  return {
    connectionState: mappedState,
    isConnected,
    socket: null,
    reconnect,
  };
}
