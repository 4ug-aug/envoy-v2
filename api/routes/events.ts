/**
 * GET /events — SSE stream for a session. Subscribe with ?sessionId=...
 */

import { Hono } from "hono";
import { eventBus } from "../lib/event-bus";
import { streamSSE } from "hono/streaming";

const events = new Hono();

events.get("/", (c) => {
  const sessionId = c.req.query("sessionId");
  console.log("[events] SSE connection request for session:", sessionId);
  if (!sessionId) {
    return c.json({ error: "Missing sessionId query" }, 400);
  }

  return streamSSE(c, async (stream) => {
    console.log("[events] SSE stream opened for session:", sessionId);
    const unsubscribe = eventBus.on(sessionId, (payload) => {
      console.log("[events] Emitting event to SSE:", payload);
      stream.writeSSE({
        data: JSON.stringify(payload),
        event: "message",
      });
    });

    stream.writeSSE({ data: JSON.stringify({ type: "connected", sessionId }), event: "message" });
    console.log("[events] Sent 'connected' message to SSE");

    // Keep the stream alive until aborted
    await new Promise<void>((resolve) => {
      c.req.raw.signal.addEventListener(
        "abort",
        () => {
          console.log("[events] SSE connection closed for session:", sessionId);
          unsubscribe();
          resolve();
        },
        { once: true }
      );
    });
  });
});

export default events;
