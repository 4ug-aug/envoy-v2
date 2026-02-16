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

- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — LLM provider (at least one required)
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

- **processor.ts** — Orchestrates a turn: builds context → calls LLM → (TODO: parse tool calls → execute → loop). Currently single-turn.
- **llm.ts** — Multi-provider wrapper. Auto-detects OpenAI vs Anthropic by which API key is set. Defaults: `gpt-4o-mini` / `claude-3-5-haiku`.
- **prompt.ts** — Builds the message array: `[system, ...history, user_message]`.

### Tool System (`api/tools/`)

- **registry.ts** — Central map of tool name → handler. Tools: `read_file`, `write_file`, `list_dir`, `run_shell`.
- **fs.ts** — File operations sandboxed to `TOOLS_FS_ROOT` with path traversal prevention.
- **shell.ts** — Gated behind `TOOLS_SHELL_ENABLED`.

### Data Layer (`api/db/`, `api/session/`)

SQLite via `bun:sqlite` (singleton in `client.ts`). Schema auto-initializes on first connection. Two tables: `sessions` and `messages`. Session manager handles CRUD; history module handles message retrieval (last 50 by default) and persistence.

### Event Streaming (`api/lib/event-bus.ts`)

In-memory pub/sub keyed by sessionId. Emits typed events: `start`, `delta` (streaming chunks), `done`. Consumed by the SSE endpoint.

### Frontend (`src/`)

React 19 + Tailwind CSS + ShadCN/UI (New York style). UI components live in `src/components/ui/`. Chat interface is not yet built — `App.tsx` is a scaffold. Path alias: `@/*` → `./src/*`.

## Conventions

- **Always use Bun**, not Node.js/npm/pnpm. Use `bun:sqlite` not better-sqlite3, `Bun.serve()` not express, `Bun.file` over `node:fs`, `Bun.$` over execa.
- Hono for HTTP routing with `@hono/zod-validator` for request validation.
- ShadCN/UI components are added via `bunx shadcn@latest add <component>`.
- Zod v4 for schema validation.
