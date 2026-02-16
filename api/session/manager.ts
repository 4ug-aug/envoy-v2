/**
 * CRUD for sessions. Uses db client for persistence.
 */

import { getDb } from "../db/client";

export type Session = {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
};

export function createSession(id?: string): Session {
  const db = getDb();
  const sid = id ?? crypto.randomUUID();
  const now = Date.now();
  db.run(
    "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
    [sid, "New chat", now, now]
  );
  return { id: sid, title: "New chat", created_at: now, updated_at: now };
}

export function getSession(id: string): Session | null {
  const db = getDb();
  const row = db.query<Session, { id: string }>("SELECT * FROM sessions WHERE id = ?").get({ id });
  return row ?? null;
}

export function listSessions(): Session[] {
  const db = getDb();
  return db.query<Session, { order_by: string }>("SELECT * FROM sessions ORDER BY updated_at DESC").all({ order_by: "updated_at DESC" });
}

export function updateSession(id: string, updates: { title?: string }): void {
  const db = getDb();
  if (updates.title !== undefined) {
    db.run("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?", [
      updates.title,
      Date.now(),
      id,
    ]);
  }
}

export function deleteSession(id: string): void {
  const db = getDb();
  db.run("DELETE FROM sessions WHERE id = ?", [id]);
}
