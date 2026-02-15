/**
 * GET /events — SSE stream for a session. Subscribe with ?sessionId=...
 */

import { Hono } from "hono";
import { eventBus } from "../lib/event-bus";
import { streamSSE } from "hono/streaming";

const events = new Hono();

events.get("/", (c) => {
  const sessionId = c.req.query("sessionId");
  if (!sessionId) {
    return c.json({ error: "Missing sessionId query" }, 400);
  }

  return streamSSE(c, async (stream) => {
    const unsubscribe = eventBus.on(sessionId, (payload) => {
      stream.writeSSE({
        data: JSON.stringify(payload),
        event: "message",
      });
    });

    stream.writeSSE({ data: JSON.stringify({ type: "connected", sessionId }), event: "open" });

    c.req.raw.signal.addEventListener(
      "abort",
      () => {
        unsubscribe();
        stream.close();
      },
      { once: true }
    );
  });
});

export default events;
