/**
 * SQLite table definitions for the Envoy backend.
 * Run migrations or ensure these are applied via client.ts.
 */

export const SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT 'New chat',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const MESSAGES_TABLE = `
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
`;

/** Safe migration: add conversation_state column if it doesn't exist. */
export const ADD_CONVERSATION_STATE = `
ALTER TABLE sessions ADD COLUMN conversation_state TEXT DEFAULT '[]';
`;

export const CUSTOM_TOOLS_TABLE = `
CREATE TABLE IF NOT EXISTS custom_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  input_schema TEXT NOT NULL DEFAULT '{}',
  code TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const SCHEDULED_TASKS_TABLE = `
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  cron TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const TASK_RUNS_TABLE = `
CREATE TABLE IF NOT EXISTS task_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  result TEXT,
  output TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
);
`;

export const ALL_SCHEMAS = [SESSIONS_TABLE, MESSAGES_TABLE, CUSTOM_TOOLS_TABLE, SCHEDULED_TASKS_TABLE, TASK_RUNS_TABLE];

/**
 * Migrations that may fail if already applied (e.g. ALTER TABLE ADD COLUMN).
 * Run these with try/catch.
 */
export const ADD_TASK_RUNS_OUTPUT = `
ALTER TABLE task_runs ADD COLUMN output TEXT;
`;

export const MIGRATIONS = [ADD_CONVERSATION_STATE, ADD_TASK_RUNS_OUTPUT];
