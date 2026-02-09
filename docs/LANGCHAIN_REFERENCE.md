# LangChain Agent Building Reference

A condensed guide for building AI agents with LangChain and LangGraph.

## Core Concepts

### Agent Architecture
An agent consists of:
- **Model**: LLM that powers decision-making
- **Tools**: Functions the agent can call
- **System Prompt**: Defines agent behavior and role
- **Memory**: Short-term (conversation) and long-term (persistent)
- **Response Format**: Optional structured output schema

### Basic Agent Setup

```typescript
import { createAgent, tool } from "langchain";
import * as z from "zod";

const agent = createAgent({
  model: "claude-sonnet-4-5-20250929",
  tools: [/* your tools */],
  systemPrompt: "You are a helpful assistant...",
  checkpointer: new MemorySaver(), // for conversation memory
  responseFormat: z.object({ /* structured output */ }),
});

// Invoke the agent
const response = await agent.invoke(
  { messages: [{ role: "user", content: "Hello!" }] },
  { 
    configurable: { thread_id: "1" }, // for memory persistence
    context: { user_id: "123" }        // runtime context
  }
);
```

## Tools

### Creating Tools

Tools are callable functions with well-defined schemas that the LLM can invoke.

**Basic Tool:**
```typescript
import { tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city.",
    schema: z.object({
      city: z.string().describe("The city to get weather for"),
    }),
  }
);
```

**Alternative: JSON Schema**
```typescript
const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city.",
    schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "The city name" }
      },
      required: ["city"]
    },
  }
);
```

### Accessing Runtime Information

Tools can access three types of runtime data through the `config` parameter:

#### 1. Context (Immutable Runtime Config)
```typescript
import { tool, type ToolRuntime } from "langchain";

type MyRuntime = ToolRuntime<unknown, { user_id: string }>;

const getUserInfo = tool(
  (input, config: MyRuntime) => {
    const { user_id } = config.context;
    return `User ID: ${user_id}`;
  },
  {
    name: "get_user_info",
    description: "Get user information",
    schema: z.object({}),
  }
);

// Define context schema for agent
const contextSchema = z.object({
  user_id: z.string(),
});

const agent = createAgent({
  model: "gpt-4",
  tools: [getUserInfo],
  contextSchema,
});
```

#### 2. Long-term Memory (Store)
Persistent storage that survives across conversations:

```typescript
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const saveUserData = tool(
  async ({ user_id, name, email }, config) => {
    await config.store.put(["users"], user_id, { name, email });
    return "Saved successfully";
  },
  {
    name: "save_user_data",
    schema: z.object({
      user_id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  }
);

const getUserData = tool(
  async ({ user_id }, config) => {
    return await config.store.get(["users"], user_id);
  },
  {
    name: "get_user_data",
    schema: z.object({ user_id: z.string() }),
  }
);

const agent = createAgent({
  model: "gpt-4",
  tools: [saveUserData, getUserData],
  store,
});
```

#### 3. Stream Writer (Real-time Updates)
Stream progress updates during long-running operations:

```typescript
const longRunningTask = tool(
  ({ task }, config) => {
    const writer = config.writer;
    
    if (writer) {
      writer("Starting task...");
      // ... do work ...
      writer("Processing...");
      // ... more work ...
      writer("Almost done...");
    }
    
    return "Task completed!";
  },
  {
    name: "long_task",
    schema: z.object({ task: z.string() }),
  }
);
```

## Advanced: ToolNode for Custom Workflows

For fine-grained control beyond `createAgent`, use `ToolNode` in LangGraph:

```typescript
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

const toolNode = new ToolNode([search, calculator]);

// Error handling options:
// - Default: throw errors
// - Catch all: new ToolNode(tools, { handleToolErrors: true })
// - Custom message: new ToolNode(tools, { 
//     handleToolErrors: "Error occurred, try again" 
//   })

const graph = new StateGraph(MessagesAnnotation)
  .addNode("llm", callLlm)
  .addNode("tools", toolNode)
  .addEdge("__start__", "llm")
  .addConditionalEdges("llm", toolsCondition) // Routes to "tools" or "__end__"
  .addEdge("tools", "llm")
  .compile();
```

## Model Configuration

```typescript
import { initChatModel } from "langchain";

const model = await initChatModel(
  "claude-sonnet-4-5-20250929",
  {
    temperature: 0.5,    // 0-1, controls randomness
    timeout: 10,         // seconds
    maxTokens: 1000,     // max response length
  }
);

const agent = createAgent({ model, tools: [...] });
```

## Memory Management

### Short-term Memory (Conversation State)
```typescript
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver(); // In-memory (dev only)

const agent = createAgent({
  model: "gpt-4",
  tools: [...],
  checkpointer,
});

// Use thread_id to maintain conversation context
const config = { configurable: { thread_id: "user-123" } };

await agent.invoke({ messages: [{ role: "user", content: "Hi" }] }, config);
await agent.invoke({ messages: [{ role: "user", content: "Remember me?" }] }, config);
```

For production, use persistent checkpointers (PostgreSQL, Redis, etc.).

### Long-term Memory (Store)
```typescript
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

// Store uses namespace/key pattern:
// await store.put([namespace], key, value)
// await store.get([namespace], key)

const agent = createAgent({
  model: "gpt-4",
  tools: [toolsWithStoreAccess],
  store,
});
```

## Structured Output

Define expected response format:

```typescript
const responseFormat = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()).optional(),
});

const agent = createAgent({
  model: "gpt-4",
  tools: [...],
  responseFormat,
});

const response = await agent.invoke({
  messages: [{ role: "user", content: "What is 2+2?" }]
});

console.log(response.structuredResponse);
// { answer: "4", confidence: 1.0, sources: undefined }
```

## System Prompts

Define clear, actionable instructions:

```typescript
const systemPrompt = `You are an expert assistant specializing in [DOMAIN].

Your capabilities:
- [Tool 1]: Use for [specific purpose]
- [Tool 2]: Use for [specific purpose]

Guidelines:
- Always verify information before responding
- If unsure, ask clarifying questions
- Keep responses concise and actionable

Current context: You are helping user {user_id} with their request.`;

const agent = createAgent({
  model: "gpt-4",
  systemPrompt,
  tools: [...],
});
```

## Prebuilt Tools

LangChain provides many ready-to-use tools. See [integrations/tools](https://docs.langchain.com/oss/javascript/integrations/tools) for:
- Web search (Tavily, SerpAPI, etc.)
- Database access
- API integrations
- Code execution
- File operations
- And more

## Server-side Tools

Some models have built-in tools executed by the provider:
- Web search
- Code interpreters
- Image generation

Refer to specific model documentation for availability.

## Complete Example Pattern

```typescript
import { createAgent, tool, type ToolRuntime } from "langchain";
import { MemorySaver, InMemoryStore } from "@langchain/langgraph";
import * as z from "zod";

// 1. Define context schema
const contextSchema = z.object({
  user_id: z.string(),
  session_id: z.string(),
});

type MyRuntime = ToolRuntime<unknown, z.infer<typeof contextSchema>>;

// 2. Create tools
const myTool = tool(
  async ({ input }, config: MyRuntime) => {
    // Access context
    const { user_id } = config.context;
    
    // Access store (long-term memory)
    const userData = await config.store?.get(["users"], user_id);
    
    // Stream updates
    config.writer?.(`Processing for user ${user_id}...`);
    
    return `Result: ${input}`;
  },
  {
    name: "my_tool",
    description: "Does something useful",
    schema: z.object({ input: z.string() }),
  }
);

// 3. Set up memory
const checkpointer = new MemorySaver();
const store = new InMemoryStore();

// 4. Define response format
const responseFormat = z.object({
  result: z.string(),
  metadata: z.object({
    tool_calls: z.number(),
  }).optional(),
});

// 5. Create agent
const agent = createAgent({
  model: "gpt-4",
  systemPrompt: "You are a helpful assistant...",
  tools: [myTool],
  contextSchema,
  checkpointer,
  store,
  responseFormat,
});

// 6. Invoke with full configuration
const response = await agent.invoke(
  { messages: [{ role: "user", content: "Help me!" }] },
  {
    configurable: { thread_id: "conversation-1" },
    context: { user_id: "user-123", session_id: "session-456" },
  }
);

console.log(response.structuredResponse);
```

## Key Differences: createAgent vs ToolNode

| Feature | createAgent | ToolNode |
|---------|-------------|----------|
| Use case | Quick agent setup | Custom workflows |
| Abstraction | High-level | Low-level |
| Tool execution | Automatic | Manual control |
| Routing | Built-in | Custom logic required |
| When to use | Most cases | Need fine-grained control |

## Common Patterns

### Pattern 1: Conversational Agent with Memory
```typescript
const agent = createAgent({
  model: "gpt-4",
  tools: [searchTool, calculatorTool],
  checkpointer: new MemorySaver(),
});

const config = { configurable: { thread_id: "user-123" } };
// Conversation persists across invocations with same thread_id
```

### Pattern 2: User-specific Context
```typescript
const agent = createAgent({
  model: "gpt-4",
  tools: [userSpecificTool],
  contextSchema: z.object({ user_id: z.string() }),
});

await agent.invoke(
  { messages: [...] },
  { context: { user_id: "123" } }
);
```

### Pattern 3: Persistent Data Storage
```typescript
const agent = createAgent({
  model: "gpt-4",
  tools: [saveDataTool, loadDataTool],
  store: new InMemoryStore(),
});
// Tools can save/load data that persists across sessions
```

### Pattern 4: Structured Responses
```typescript
const agent = createAgent({
  model: "gpt-4",
  tools: [...],
  responseFormat: z.object({
    answer: z.string(),
    confidence: z.number(),
  }),
});
// Guaranteed structured output
```

## Quick Reference: Common Imports

```typescript
// Core
import { createAgent, tool, initChatModel, type ToolRuntime } from "langchain";

// Memory
import { MemorySaver, InMemoryStore } from "@langchain/langgraph";

// Custom workflows
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

// Schema validation
import * as z from "zod";

// Messages
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
```

## Resources

- [Full Quickstart](https://docs.langchain.com/oss/javascript/langchain/quickstart)
- [Tools Documentation](https://docs.langchain.com/oss/javascript/langchain/tools)
- [LangGraph Docs](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [Tool Integrations](https://docs.langchain.com/oss/javascript/integrations/tools)
- [Model Providers](https://docs.langchain.com/oss/javascript/integrations/providers)
