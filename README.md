# LangGraph Chat Application

A production-ready chat application powered by LangGraph with support for multiple LLM providers (OpenAI, Anthropic, Google).

## Features

- 🤖 **Multiple LLM Providers**: OpenAI, Anthropic, Google, or Mock mode
- 💬 **Beautiful Chat UI**: Modern React interface with Tailwind CSS
- 🔄 **State Management**: LangGraph for reliable agent orchestration
- ⚙️ **Flexible Configuration**: Environment-based provider setup
- 🚀 **Fast Development**: Bun runtime with hot reload
- 📦 **Full Stack**: React frontend + Bun backend in one app

## Quick Start

```bash
# Install dependencies
bun install

# Start development server (uses mock LLM by default)
bun dev
```

Open http://localhost:3000 and start chatting!

## Configure LLM Provider

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API key
LLM_PROVIDER=openai  # or: anthropic, google, mock
LLM_MODEL=gpt-4
LLM_API_KEY=sk-your-api-key-here

# Restart the server
bun dev
```

See [QUICKSTART.md](./QUICKSTART.md) for detailed setup instructions.

## Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Get started quickly with setup instructions
- [LANGGRAPH.md](./LANGGRAPH.md) - Complete LangGraph integration guide

## Project Structure

```
src/
├── agents/              # LangGraph agents
│   ├── simple-graph.ts
│   └── conversational-graph.ts
├── lib/
│   └── llm-config.ts   # LLM provider configuration
├── components/ui/       # UI components (shadcn)
├── LangGraphChat.tsx   # Chat interface
├── App.tsx             # Main app
└── index.ts            # Bun server

.env.example            # Environment template
```

## Supported LLM Providers

| Provider | Models | Get API Key |
|----------|--------|-------------|
| OpenAI | gpt-4, gpt-3.5-turbo | [platform.openai.com](https://platform.openai.com/api-keys) |
| Anthropic | claude-3.5-sonnet, claude-3-opus | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| Google | gemini-1.5-pro, gemini-1.5-flash | [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| Mock | No API required | Development mode |

## Commands

```bash
# Development
bun dev              # Start dev server with hot reload

# Production
bun start            # Run in production mode

# Testing
bun run test:langgraph  # Test LangGraph agents

# Build
bun run build        # Build for production
```

## Tech Stack

- **Runtime**: [Bun](https://bun.com)
- **Frontend**: React 19 + Tailwind CSS
- **UI Components**: shadcn/ui
- **AI Framework**: [LangGraph](https://langchain.com/langgraph) + LangChain
- **LLM Providers**: OpenAI, Anthropic, Google

## API Endpoints

- `POST /api/invoke` - Send message to agent
- `GET /api/config` - Get current LLM configuration

## License

MIT
