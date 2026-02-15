/**
 * The Recursive Loop — the "heart" of the agent.
 * Receives a user message, loads history, calls LLM (with optional tool use),
 * persists the turn, and emits events for SSE.
 */

import { callLLM } from "./llm";
import { buildContext, type Message } from "./prompt";
import { getToolRegistry } from "../tools/registry";
import { eventBus } from "../lib/event-bus";

export type ProcessInput = {
  sessionId: string;
  userMessage: string;
  history: Message[];
};

export type ProcessResult = {
  assistantMessage: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

/**
 * Process one user message: build context, call LLM, optionally run tools and loop.
 * Emits events to eventBus for the given sessionId so SSE clients can stream.
 */
export async function processTurn(input: ProcessInput): Promise<ProcessResult> {
  const { sessionId, userMessage, history } = input;
  const messages = buildContext({ history, userMessage });

  const emit = (payload: unknown) => eventBus.emit(sessionId, payload);

  emit({ type: "start" });

  const registry = getToolRegistry();
  let currentMessages = messages;
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    const result = await callLLM(currentMessages, { model: "gpt-4o-mini", temperature: 0.7 });
    emit({ type: "delta", content: result.content });
    emit({ type: "done", content: result.content, usage: result.usage });

    // TODO: Parse tool_calls from result and run via registry; append tool results and loop.
    // For now, single turn only.
    return {
      assistantMessage: result.content,
      usage: result.usage,
    };
  }

  return {
    assistantMessage: "[Max iterations reached]",
  };
}
