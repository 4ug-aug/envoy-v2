# LangGraph Integration

This project demonstrates a complete integration of LangGraph with real LLM providers for building stateful AI agents.

## What's Included

### 1. LLM Configuration (`src/lib/llm-config.ts`)
Flexible configuration system supporting multiple providers:
- **OpenAI**: GPT-4, GPT-3.5-turbo
- **Anthropic**: Claude 3.5 Sonnet, Opus, Haiku
- **Google**: Gemini 1.5 Pro, Flash
- **Mock**: Development mode without API calls

Features:
- Environment-based configuration
- Custom API endpoints support
- Automatic provider initialization
- Configuration validation

### 2. Simple Graph (`src/agents/simple-graph.ts`)
A basic LangGraph example that always responds with "hello world". This demonstrates:
- StateSchema with MessagesValue
- GraphNode definition
- StateGraph with START and END nodes
- Basic graph compilation and invocation

### 3. Conversational Graph (`src/agents/conversational-graph.ts`)
Production-ready graph with real LLM integration. Features:
- Automatic provider switching (real LLM vs mock)
- System prompt configuration
- Error handling for API failures
- Message state management
- Conditional fallback logic

### 4. Chat UI (`src/LangGraphChat.tsx`)
A beautiful React chat interface featuring:
- Real-time message streaming
- Auto-scrolling chat history
- Loading states with spinner
- Suggested prompts for users
- Clear chat functionality
- **LLM provider badge** showing current configuration

### 5. API Integration (`src/index.ts`)
The main server includes endpoints:
- `/api/invoke` - Send messages to the agent
- `/api/config` - Get current LLM configuration

### 6. Test Suite (`src/test-langgraph.ts`)
Comprehensive tests demonstrating both graph types.

## Running the Examples

### Start the development server with UI:
```bash
bun run dev
```

Then open http://localhost:3000 in your browser. You'll see:
- **LangGraph Chat** tab: Interactive chat interface
- **API Tester** tab: Test any API endpoints

### Test the graphs directly (CLI):
```bash
bun run test:langgraph
```

### Test the API endpoint (cURL):
```bash
curl -X POST http://localhost:3000/api/invoke \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello there!"}'
```

## Configuring LLM Providers

### Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
# Provider: openai, anthropic, google, or mock
LLM_PROVIDER=openai

# Model name (depends on provider)
LLM_MODEL=gpt-4

# API Key
LLM_API_KEY=sk-your-api-key

# Optional: Custom endpoint
LLM_BASE_URL=

# Optional: Temperature (0.0 - 2.0)
LLM_TEMPERATURE=0.7

# Optional: Max tokens
LLM_MAX_TOKENS=1000
```

### Provider-Specific Setup

#### OpenAI
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
LLM_API_KEY=sk-...
```

Supported models:
- `gpt-4` - Most capable
- `gpt-4-turbo` - Faster
- `gpt-3.5-turbo` - Affordable

Get your API key: https://platform.openai.com/api-keys

#### Anthropic (Claude)
```bash
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_API_KEY=sk-ant-...
```

Supported models:
- `claude-3-5-sonnet-20241022` - Best balance
- `claude-3-opus-20240229` - Most capable
- `claude-3-haiku-20240307` - Fastest

Get your API key: https://console.anthropic.com/settings/keys

#### Google (Gemini)
```bash
LLM_PROVIDER=google
LLM_MODEL=gemini-1.5-pro
LLM_API_KEY=...
```

Supported models:
- `gemini-1.5-pro` - Most capable
- `gemini-1.5-flash` - Faster

Get your API key: https://makersuite.google.com/app/apikey

#### Mock (Development)
```bash
LLM_PROVIDER=mock
```

No API key required. Uses simple keyword-based responses.

## UI Features

The LangGraph Chat interface includes:
- **Message History**: See your conversation with the agent
- **User/AI Message Bubbles**: Clear visual distinction between you and the agent
- **Loading Indicator**: Shows when the agent is thinking
- **Auto-scroll**: Automatically scrolls to latest messages
- **Clear Chat**: Reset the conversation anytime
- **Suggested Prompts**: Quick-start suggestions for new users
- **Provider Badge**: Shows which LLM is currently active

Try these prompts in the UI:
- "Hello!"
- "How are you?"
- "What's your name?"
- "Tell me about yourself"

## API Reference

### GET /api/config

Get current LLM configuration.

**Response:**
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "hasApiKey": true,
  "baseURL": "default",
  "temperature": 0.7,
  "maxTokens": 1000,
  "display": "OPENAI - gpt-4"
}
```

### POST /api/invoke

Send a message to the agent.

**Request:**
```json
{
  "prompt": "Hello!"
}
```

**Response:**
```json
{
  "message": "LangGraph invoked successfully",
  "response": "Hello! How can I help you today?",
  "fullResult": { ... }
}
```

## Next Steps

To build more sophisticated agents, consider:

1. ✅ **Integrate real LLMs**: Configure OpenAI, Anthropic, or Google
2. **Add tools**: Give your agent the ability to call external functions
3. **Implement memory**: Use LangGraph's state persistence for long-running conversations
4. **Add conditional edges**: Create branching logic based on agent state
5. **Human-in-the-loop**: Add interrupts for human oversight
6. **Streaming responses**: Add real-time token streaming to the UI
7. **Multi-agent systems**: Create multiple specialized agents
8. **RAG (Retrieval)**: Add document search and retrieval

## Resources

- [LangGraph Documentation](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangChain JavaScript](https://docs.langchain.com/oss/javascript/langchain/overview)
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com)
- [Google AI](https://ai.google.dev)
