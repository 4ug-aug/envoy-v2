import { useRef, useEffect, useState, type FormEvent } from "react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import "./index.css";

export function App() {
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b px-4 py-3 shrink-0">
        <h1 className="text-lg font-semibold">Envoy</h1>
      </header>

      <ScrollArea className="flex-1 px-4">
        <div ref={scrollRef} className="max-w-2xl mx-auto py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              Send a message to get started.
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] whitespace-pre-wrap text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse align-text-bottom" />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t px-4 py-3 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            disabled={isLoading}
            autoFocus
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

export default App;
