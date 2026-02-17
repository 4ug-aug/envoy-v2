# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
bun dev              # Dev server with HMR on :3000
bun start            # Production server
bun run build.ts     # Production build to dist/
bun test             # Run tests (bun:test, not jest/vitest)
```

## Environment Variables

Bun auto-loads `.env` (no dotenv needed).

- `LLM_API_KEY` — API key for the LLM provider
- `LLM_BASE_URL` — OpenAI-compatible endpoint (default: `https://openrouter.ai/api/v1`)
- `LLM_MODEL` — Model identifier (default: `anthropic/claude-sonnet-4`)
- `DATABASE_PATH` — SQLite file (default: `./data/envoy.sqlite`)
- `TOOLS_FS_ROOT` — Sandbox root for file tools (default: cwd)
- `TOOLS_SHELL_ENABLED` — Enable shell tool (default: false)
- `PORT` — Server port (default: 3000)

## Architecture

**Envoy** is an AI agent system with a Bun/Hono backend and React 19 frontend.

### Server Entry (`src/index.ts`)

`Bun.serve()` hosts both the React frontend (via HTML imports, not Vite) and the Hono API at `/api/*`. The HTML entry at `src/index.html` loads `src/frontend.tsx` directly — Bun's bundler handles transpilation.

### API Layer (`api/`)

Routes are mounted under `/api/v1/` via Hono:
- **POST /api/v1/chat** — Accepts `{ sessionId?, message }`, creates session if needed, runs agent turn, persists messages, returns response.
- **GET /api/v1/events?sessionId=...** — SSE stream that subscribes to the in-memory EventBus for real-time agent output.

### Agent Loop (`api/agent/`)

- **processor.ts** — Orchestrates a turn using AI SDK `streamText()` with automatic tool calling loop (`maxSteps: 10`). Streams deltas and tool events via EventBus.
- **provider.ts** — Configurable LLM via `@ai-sdk/openai-compatible`. Works with OpenRouter, Ollama, LM Studio, or any OpenAI-compatible endpoint.
- **tools.ts** — AI SDK `tool()` wrappers around existing fs/shell implementations.
- **prompt.ts** — System prompt constant.

### Tool System (`api/tools/`)

- **registry.ts** — Central map of tool name → handler. Tools: `read_file`, `write_file`, `list_dir`, `search_web`.
- **fs.ts** — File operations sandboxed to `TOOLS_FS_ROOT` with path traversal prevention.
- **web.ts** — Search the web for information.

### Data Layer (`api/db/`, `api/session/`)

SQLite via `bun:sqlite` (singleton in `client.ts`). Schema auto-initializes on first connection. Two tables: `sessions` (with `conversation_state` JSON column for full `CoreMessage[]`) and `messages` (human-readable log). Session manager handles CRUD; history module handles message retrieval and conversation state persistence.

### Event Streaming (`api/lib/event-bus.ts`)

In-memory pub/sub keyed by sessionId. Emits typed events: `start`, `delta` (streaming chunks), `done`. Consumed by the SSE endpoint.

### Frontend (`src/`)

React 19 + Tailwind CSS + ShadCN/UI (New York style). UI components live in `src/components/ui/`. Chat interface in `App.tsx` with custom `useChat` hook for SSE streaming. Path alias: `@/*` → `./src/*`.

## Conventions

- **Always use Bun**, not Node.js/npm/pnpm. Use `bun:sqlite` not better-sqlite3, `Bun.serve()` not express, `Bun.file` over `node:fs`, `Bun.$` over execa.
- Hono for HTTP routing with `@hono/zod-validator` for request validation.
- ShadCN/UI components are added via `bunx shadcn@latest add <component>`.
- Zod v4 for schema validation.
