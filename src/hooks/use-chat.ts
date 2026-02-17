import { useState, useRef, useCallback, useEffect } from "react";

export type ToolCall = {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming: boolean;
  toolCalls?: ToolCall[];
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function useChat(sessionId: string, onTurnComplete?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const sessionIdRef = useRef<string>(sessionId);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectDelay = 30000; // 30 seconds max

  const connectSSE = useCallback((sid: string) => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    console.log("[use-chat] Opening SSE connection for session:", sid);
    setConnectionStatus("connecting");

    const es = new EventSource(`/api/v1/events?sessionId=${sid}`);
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
        connectSSE(sessionIdRef.current);
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

      if (data.type === "tool_calls") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.isStreaming) {
            const incoming: ToolCall[] = (data.toolCalls ?? []).map((tc: any) => ({
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              args: tc.args ?? {},
            }));
            const existing = last.toolCalls ?? [];
            return [
              ...prev.slice(0, -1),
              { ...last, toolCalls: [...existing, ...incoming] },
            ];
          }
          return prev;
        });
      }

      if (data.type === "tool_results") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.isStreaming) {
            const resultMap: Record<string, unknown> = {};
            for (const r of data.toolResults ?? []) {
              resultMap[r.toolCallId] = r.result;
            }
            const updated = (last.toolCalls ?? []).map((tc) =>
              resultMap[tc.toolCallId] !== undefined
                ? { ...tc, result: resultMap[tc.toolCallId] }
                : tc
            );
            return [...prev.slice(0, -1), { ...last, toolCalls: updated }];
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
        onTurnComplete?.();
      }
    });
  }, [onTurnComplete]);

  // When sessionId changes: clear messages, load history, reconnect SSE
  useEffect(() => {
    sessionIdRef.current = sessionId;
    reconnectAttemptsRef.current = 0;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setMessages([]);
    setIsLoading(false);

    // Load existing messages for this session
    fetch(`/api/v1/sessions/${sessionId}/messages`)
      .then((r) => r.json())
      .then((rows: { role: string; content: string }[]) => {
        const loaded: ChatMessage[] = rows.map((row) => ({
          id: crypto.randomUUID(),
          role: row.role as "user" | "assistant",
          content: row.content,
          isStreaming: false,
        }));
        setMessages(loaded);
      })
      .catch(() => {
        // New session — no messages yet, that's fine
      });

    connectSSE(sessionId);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [sessionId, connectSSE]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Ensure connection is ready before sending
    const es = eventSourceRef.current;
    if (!es || es.readyState !== EventSource.OPEN) {
      console.log("[use-chat] Connection not ready, reconnecting...");
      connectSSE(sessionIdRef.current);

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
  }, [isLoading, connectSSE]);

  return { messages, isLoading, sendMessage, connectionStatus };
}
