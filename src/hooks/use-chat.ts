import { useState, useRef, useCallback, useEffect } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming: boolean;
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectDelay = 30000; // 30 seconds max

  const connectSSE = useCallback(() => {
    const sessionId = sessionIdRef.current;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    console.log("[use-chat] Opening SSE connection for session:", sessionId);
    setConnectionStatus("connecting");

    const es = new EventSource(`/api/v1/events?sessionId=${sessionId}`);
    eventSourceRef.current = es;

    es.addEventListener("open", () => {
      console.log("[use-chat] SSE connection opened");
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0; // Reset on successful connection
    });

    es.addEventListener("error", (error) => {
      console.error("[use-chat] SSE error:", error);
      setConnectionStatus("error");

      // Auto-reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), maxReconnectDelay);
      reconnectAttemptsRef.current++;

      console.log(`[use-chat] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = window.setTimeout(() => {
        connectSSE();
      }, delay);
    });

    es.addEventListener("message", (event) => {
      console.log("[use-chat] Received SSE message:", event.data);
      const data = JSON.parse(event.data);

      if (data.type === "delta") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.isStreaming) {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + data.content },
            ];
          }
          return prev;
        });
      }

      if (data.type === "done") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.isStreaming) {
            return [
              ...prev.slice(0, -1),
              { ...last, isStreaming: false },
            ];
          }
          return prev;
        });
        setIsLoading(false);
      }
    });
  }, []);

  // Connect SSE on mount
  useEffect(() => {
    connectSSE();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectSSE]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Ensure connection is ready before sending
    const es = eventSourceRef.current;
    if (!es || es.readyState !== EventSource.OPEN) {
      console.log("[use-chat] Connection not ready, reconnecting...");
      connectSSE();

      // Wait up to 5 seconds for connection
      const startTime = Date.now();
      while (Date.now() - startTime < 5000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (eventSourceRef.current?.readyState === EventSource.OPEN) {
          break;
        }
      }

      if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
        console.error("[use-chat] Failed to establish connection");
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      isStreaming: false,
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    try {
      await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          message: content,
        }),
      });
    } catch (err) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...last, content: "Failed to send message.", isStreaming: false },
          ];
        }
        return prev;
      });
      setIsLoading(false);
    }
  }, [isLoading, connectionStatus, connectSSE]);

  return { messages, isLoading, sendMessage, connectionStatus };
}
