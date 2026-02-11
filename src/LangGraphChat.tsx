import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useRef, useEffect, type FormEvent } from "react";

interface Message {
  role: "user" | "ai" | "system";
  content: string;
  metadata?: {
    type?: "token" | "tool_call" | "node_update";
    node?: string;
    tool_calls?: any[];
  };
}

interface LLMConfig {
  provider: string;
  model: string;
  hasApiKey: boolean;
  baseURL: string;
  temperature: number;
  maxTokens: number;
  display: string;
}

export function LangGraphChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: "👋 Hello! I'm Envoy, your API assistant. I can help you work with various APIs using my skill system!"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>("");
  const [toolCalls, setToolCalls] = useState<any[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load LLM config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error("Failed to load config:", err));
  }, []);

  const sendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    const prompt = formData.get("prompt") as string;

    if (!prompt.trim()) return;

    // Add user message to chat
    const userMessage: Message = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input
    form.reset();
    setIsLoading(true);
    setCurrentStreamingMessage("");
    setToolCalls([]);

    // Track accumulated message locally to avoid state closure issues
    let accumulatedMessage = "";

    try {
      // Use Server-Sent Events for streaming
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1] as string || "{}");

          if (event === "token") {
            // Accumulate LLM tokens
            accumulatedMessage += data.content;
            setCurrentStreamingMessage(accumulatedMessage);
          } else if (event === "tool_call") {
            // Show tool call
            setToolCalls((prev) => [...prev, ...data.tool_calls]);
            
            // Add system message for tool calls
            const toolNames = data.tool_calls.map((tc: any) => tc.name || tc.function?.name).join(", ");
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `Calling tools: ${toolNames}`,
                metadata: { type: "tool_call", tool_calls: data.tool_calls }
              }
            ]);
          } else if (event === "update") {
            // Show node updates
            const nodeName = Object.keys(data.data)[0];
            if (nodeName && nodeName !== "tools") { // Skip "tools" node updates as they're noisy
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `Executing: ${nodeName}`,
                  metadata: { type: "node_update", node: nodeName }
                }
              ]);
            }
          } else if (event === "done") {
            // Stream complete - add final message using locally tracked value
            if (accumulatedMessage.trim()) {
              setMessages((prev) => [
                ...prev,
                { role: "ai", content: accumulatedMessage }
              ]);
            }
            setIsLoading(false);
          } else if (event === "error") {
            throw new Error(data.message);
          }
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        role: "ai",
        content: `Error: ${error}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentStreamingMessage("");
      setToolCalls([]);
      inputRef.current?.focus();
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading, currentStreamingMessage]);

  const clearChat = () => {
    setMessages([
      {
        role: "ai",
        content: "Hello! I'm Envoy, your API assistant. I can help you work with various APIs using my skill system!"
      }
    ]);
    inputRef.current?.focus();
  };

  // Helper to render system messages with nice styling
  const renderSystemMessage = (message: Message) => {
    if (message.metadata?.type === "tool_call") {
      const toolNames = message.metadata.tool_calls?.map((tc: any) => tc.name || tc.function?.name) || [];
      return (
        <Alert className="max-w-[80%]">
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              TOOL
            </Badge>
            <span className="text-sm">{toolNames.join(", ")}</span>
          </AlertDescription>
        </Alert>
      );
    }

    if (message.metadata?.type === "node_update") {
      return (
        <Alert className="max-w-[80%]">
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              NODE
            </Badge>
            <span className="text-sm">{message.metadata.node}</span>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className="max-w-[80%]">
        <AlertDescription className="text-sm">
          {message.content}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <Card className="w-full min-w-2xl max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Envoy Agent</CardTitle>
            <CardDescription>
              Self-learning API agent with skill-based knowledge
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {config && (
              <Badge variant={config.provider === "mock" ? "secondary" : "default"}>
                {config.display}
              </Badge>
            )}
            {messages.length > 1 && (
              <Button variant="outline" size="sm" onClick={clearChat}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ScrollArea ref={scrollAreaRef} className="h-[400px] w-full rounded-md border p-4">
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" 
                    ? "justify-end" 
                    : message.role === "system"
                    ? "justify-center"
                    : "justify-start"
                }`}
              >
                {message.role === "system" ? (
                  renderSystemMessage(message)
                ) : (
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}
              </div>
            ))}
            {currentStreamingMessage && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-2 max-w-[80%] bg-muted">
                  <p className="text-sm whitespace-pre-wrap">{currentStreamingMessage}</p>
                </div>
              </div>
            )}
            {isLoading && !currentStreamingMessage && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-2 bg-muted flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  <p className="text-sm text-muted-foreground">Processing...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            ref={inputRef}
            name="prompt"
            placeholder="Ask me about APIs or tell me what to do..."
            disabled={isLoading}
            autoFocus
          />
          <Button type="submit" disabled={isLoading}>
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
