import { serve } from "bun";
import index from "./index.html";
import { invokeConversationalGraph } from "./agents/conversational-graph";
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

    "/api/invoke": {
      async POST(req) {
        const body = await req.json();
        const { prompt } = body;
        
        // Invoke the LangGraph
        const result = await invokeConversationalGraph(prompt || "hi!");
        
        // Extract the AI response
        const messages = result.messages;
        const lastMessage = messages[messages.length - 1];
        const response = lastMessage.kwargs?.content || lastMessage.content;
        
        return Response.json({
          message: "LangGraph invoked successfully",
          response: response,
          fullResult: result,
          method: "POST",
        });
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
