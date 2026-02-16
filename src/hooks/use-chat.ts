import { useState, useRef, useCallback, useEffect } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming: boolean;
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect SSE on mount
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    console.log("[use-chat] Opening SSE connection for session:", sessionId);
    const es = new EventSource(`/api/v1/events?sessionId=${sessionId}`);
    eventSourceRef.current = es;

    es.addEventListener("open", () => {
      console.log("[use-chat] SSE connection opened");
    });

    es.addEventListener("error", (error) => {
      console.error("[use-chat] SSE error:", error);
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

    return () => {
      es.close();
    };
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

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
  }, [isLoading]);

  return { messages, isLoading, sendMessage };
}
