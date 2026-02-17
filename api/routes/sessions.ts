/**
 * CRUD routes for sessions.
 * GET  /sessions              → list all sessions ordered by updated_at DESC
 * GET  /sessions/:id/messages → messages for a session (human-readable log)
 * POST /sessions              → create a new session
 * DELETE /sessions/:id        → delete session (messages cascade)
 */

import { Hono } from "hono";
import * as sessionManager from "../session/manager";
import { getDb } from "../db/client";

const sessions = new Hono();

sessions.get("/", (c) => {
  const list = sessionManager.listSessions();
  return c.json(list);
});

sessions.get("/:id/messages", (c) => {
  const { id } = c.req.param();
  const db = getDb();
  const rows = db
    .query<{ role: string; content: string }, [string]>(
      "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC"
    )
    .all([id]);
  return c.json(rows);
});

sessions.post("/", (c) => {
  const session = sessionManager.createSession();
  return c.json(session, 201);
});

sessions.delete("/:id", (c) => {
  const { id } = c.req.param();
  sessionManager.deleteSession(id);
  return c.json({ ok: true });
});

export default sessions;
