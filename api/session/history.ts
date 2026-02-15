/**
 * Logic to compact and retrieve chat history for a session.
 */

import { getDb } from "../db/client";

export type HistoryMessage = { role: "user" | "assistant" | "system"; content: string };

const MAX_HISTORY_MESSAGES = 50;

export function getHistory(sessionId: string, limit = MAX_HISTORY_MESSAGES): HistoryMessage[] {
  const db = getDb();
  const rows = db
    .query<{ role: string; content: string }>(
      "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?"
    )
    .all(sessionId, limit);
  return rows as HistoryMessage[];
}

export function appendMessage(
  sessionId: string,
  role: "user" | "assistant" | "system",
  content: string
): void {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  db.run(
    "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, sessionId, role, content, now]
  );
}

/**
 * Optional: compact old messages (e.g. summarize and keep last N).
 * For now we only limit how many we load.
 */
export function compactHistory(_sessionId: string): void {
  // TODO: Implement summarization or truncation if needed.
}
