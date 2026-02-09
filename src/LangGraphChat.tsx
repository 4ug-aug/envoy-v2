import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect, type FormEvent } from "react";

interface Message {
  role: "user" | "ai";
  content: string;
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
      content: "👋 Hello! I'm a LangGraph-powered agent. Ask me anything!"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<LLMConfig | null>(null);
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

    try {
      const res = await fetch("/api/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      
      // Add AI response to chat
      const aiMessage: Message = { 
        role: "ai", 
        content: data.response || "No response received" 
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: "ai",
        content: `Error: ${error}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
  }, [messages, isLoading]);

  const clearChat = () => {
    setMessages([
      {
        role: "ai",
        content: "👋 Hello! I'm a LangGraph-powered agent. Ask me anything!"
      }
    ]);
    inputRef.current?.focus();
  };

  return (
    <Card className="w-full min-w-2xl max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>LangGraph Chat</CardTitle>
            <CardDescription>
              Chat with a LangGraph-powered AI agent
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
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-2 bg-muted flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            ref={inputRef}
            name="prompt"
            placeholder="Type your message..."
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
