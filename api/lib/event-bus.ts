/**
 * Simple EventEmitter for SSE: broadcast agent events (e.g. token stream, tool calls)
 * to subscribed clients by session id.
 */

type Listener = (payload: unknown) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on(sessionId: string, listener: Listener): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(listener);
    return () => this.off(sessionId, listener);
  }

  off(sessionId: string, listener: Listener): void {
    this.listeners.get(sessionId)?.delete(listener);
  }

  emit(sessionId: string, payload: unknown): void {
    this.listeners.get(sessionId)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error("[EventBus] listener error:", e);
      }
    });
  }

  removeSession(sessionId: string): void {
    this.listeners.delete(sessionId);
  }
}

export const eventBus = new EventBus();
