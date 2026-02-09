import { serve } from "bun";
import index from "./index.html";
import { invokeEnvoy, streamEnvoy } from "./agents/envoy";
import { getConfigDisplay, loadLLMConfig } from "./lib/llm-config";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/config": {
      async GET(req) {
        const config = loadLLMConfig();
        return Response.json({
          provider: config.provider,
          model: config.model,
          hasApiKey: !!(config.apiKey && config.apiKey.length > 0),
          baseURL: config.baseURL || "default",
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          display: getConfigDisplay(),
        });
      },
    },

    "/api/stream": {
      async POST(req) {
        try {
          const body = await req.json();
          const { prompt } = body;

          // Create a ReadableStream for Server-Sent Events
          const stream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();
              let isClosed = false;

              // Helper to send SSE data
              const sendEvent = (event: string, data: any) => {
                if (isClosed) return;
                try {
                  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                  controller.enqueue(encoder.encode(message));
                } catch (error) {
                  console.error("Error sending event:", error);
                  isClosed = true;
                }
              };

              try {
                // Stream from Envoy agent
                for await (const chunk of streamEnvoy(prompt || "hi!")) {
                  if (isClosed) break;
                  
                  const [mode, data] = chunk as [string, any];

                  if (mode === "updates") {
                    // State updates from nodes
                    sendEvent("update", {
                      type: "node_update",
                      data: data,
                    });
                  } else if (mode === "messages") {
                    // LLM token chunks
                    const [messageChunk, metadata] = data as [any, any];
                    
                    // Handle tool calls
                    if (messageChunk.tool_calls && messageChunk.tool_calls.length > 0) {
                      sendEvent("tool_call", {
                        type: "tool_call",
                        tool_calls: messageChunk.tool_calls,
                        metadata: metadata,
                      });
                    }
                    
                    // Handle content tokens
                    if (messageChunk.content) {
                      sendEvent("token", {
                        type: "token",
                        content: messageChunk.content,
                        metadata: metadata,
                      });
                    }
                  }
                }

                // Send completion event
                sendEvent("done", { type: "done" });
              } catch (error) {
                console.error("Streaming error:", error);
                if (!isClosed) {
                  sendEvent("error", {
                    type: "error",
                    message: error instanceof Error ? error.message : "Unknown error",
                  });
                }
              } finally {
                isClosed = true;
                try {
                  controller.close();
                } catch (e) {
                  // Already closed, ignore
                }
              }
            },
          });

          // Return SSE response
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            },
          });
        } catch (error) {
          console.error("Error in /api/stream:", error);
          return Response.json(
            {
              message: "Error starting stream",
              error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },

    "/api/invoke": {
      async POST(req) {
        try {
          const body = await req.json();
          const { prompt } = body;
          
          // Invoke the Envoy agent
          const result = await invokeEnvoy(prompt || "hi!");
          
          // Extract the AI response
          const messages = result.messages;
          const lastMessage = messages[messages.length - 1];
          const response = lastMessage.kwargs?.content || lastMessage.content;
          
          return Response.json({
            message: "Envoy agent invoked successfully",
            response: response,
            method: "POST",
          });
        } catch (error) {
          console.error("Error in /api/invoke:", error);
          return Response.json({
            message: "Error invoking Envoy",
            response: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            error: error instanceof Error ? error.message : "Unknown error",
          }, { status: 500 });
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },

  // Increase timeout for streaming requests (default is 10 seconds)
  idleTimeout: 120, // 2 minutes
});

console.log(`🚀 Server running at ${server.url}`);
