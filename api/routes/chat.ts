/**
 * POST /chat — User sends a message. Creates session if needed, runs agent, persists and returns reply.
 */

import { Hono } from "hono";
import { processTurn } from "../agent/processor";
import * as sessionManager from "../session/manager";
import * as history from "../session/history";

const chat = new Hono();

chat.post("/", async (c) => {
  console.log("[chat] POST /chat received");
  type Body = { sessionId?: string; message: string };
  const body = (await c.req.json()) as Body;
  console.log("[chat] Request body:", body);
  const { message } = body;
  let { sessionId } = body;

  if (!message || typeof message !== "string") {
    return c.json({ error: "Missing or invalid message" }, 400);
  }

  if (!sessionId) {
    const session = sessionManager.createSession();
    sessionId = session.id;
  } else if (!sessionManager.getSession(sessionId)) {
    sessionManager.createSession(sessionId);
  }

  const conversationState = history.getConversationState(sessionId);
  console.log("[chat] Calling processTurn for session:", sessionId);

  const result = await processTurn({
    sessionId,
    userMessage: message,
    history: conversationState,
  });
  console.log("[chat] processTurn completed");

  // Save full conversation state (includes tool call/result messages)
  history.setConversationState(sessionId, result.messages);

  // Also append human-readable user/assistant text to messages table
  history.appendMessage(sessionId, "user", message);
  history.appendMessage(sessionId, "assistant", result.assistantMessage);

  const { getDb } = await import("../db/client");
  getDb().run("UPDATE sessions SET updated_at = ? WHERE id = ?", [Date.now(), sessionId]);

  // Auto-title session on first message
  const session = sessionManager.getSession(sessionId);
  if (session && session.title === "New chat") {
    const title = message.length > 40 ? message.slice(0, 40).trimEnd() + "…" : message.trim();
    sessionManager.updateSession(sessionId, { title });
  }

  return c.json({
    sessionId,
    message: result.assistantMessage,
  });
});

export default chat;
