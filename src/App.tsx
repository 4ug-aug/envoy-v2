import { useRef, useEffect, useState, type FormEvent } from "react";
import { useChat, type ConnectionStatus } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ItemGroup } from "@/components/ui/item";
import { ToolCallItem } from "@/components/tool-call-item";
import { ToolsPanel } from "@/components/tools-panel";
import { TasksPanel } from "@/components/tasks-panel";
import ReactMarkdown from "react-markdown";
import "./index.css";

export function App() {
  const { messages, isLoading, sendMessage, connectionStatus } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages and during streaming
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages]);

  // Also scroll on every frame during active streaming for smooth follow
  useEffect(() => {
    if (!isLoading) return;

    let animationFrameId: number;
    const scroll = () => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLoading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5" />
            Connected
          </Badge>
        );
      case "connecting":
        return (
          <Badge variant="secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
            Connecting
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5" />
            Reconnecting
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="outline">
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
            Disconnected
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b px-4 py-3 shrink-0 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Envoy</h1>
        <div className="flex items-center gap-2">
          <ToolsPanel />
          <TasksPanel />
          {getStatusBadge(connectionStatus)}
        </div>
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
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                <ItemGroup className="mb-2 w-full max-w-[80%]">
                  {msg.toolCalls.map((tc) => (
                    <ToolCallItem key={tc.toolCallId} toolCall={tc} />
                  ))}
                </ItemGroup>
              )}
              {(msg.content || msg.isStreaming) && (
                <div
                  className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                      : "bg-muted prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-background/50 prose-pre:text-xs"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse align-text-bottom" />
                  )}
                </div>
              )}
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
