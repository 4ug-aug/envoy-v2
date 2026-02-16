/**
 * The agent loop — streams LLM responses with automatic tool calling via AI SDK.
 */

import { streamText, type ModelMessage } from "ai";
import { getModel } from "./provider";
import { SYSTEM_PROMPT } from "./prompt";
import { agentTools } from "./tools";
import { eventBus } from "../lib/event-bus";

export type ProcessInput = {
  sessionId: string;
  userMessage: string;
  history: ModelMessage[];
};

export type ProcessResult = {
  assistantMessage: string;
  messages: ModelMessage[];
};

/**
 * Process one user turn: stream LLM with tool calling loop (maxSteps).
 * Emits events to eventBus for SSE clients.
 */
export async function processTurn(input: ProcessInput): Promise<ProcessResult> {
  const { sessionId, userMessage, history } = input;
  console.log("[processor] processTurn called, sessionId:", sessionId, "message:", userMessage);

  const messages: ModelMessage[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const emit = (payload: unknown) => eventBus.emit(sessionId, payload);
  emit({ type: "start" });
  console.log("[processor] Starting streamText...");

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages,
    tools: agentTools,
    maxSteps: 10,
    onStepFinish({ toolCalls, toolResults }) {
      if (toolCalls && toolCalls.length > 0) {
        emit({ type: "tool_calls", toolCalls });
      }
      if (toolResults && toolResults.length > 0) {
        emit({ type: "tool_results", toolResults });
      }
    },
  });

  let fullText = "";
  console.log("[processor] Starting text stream iteration...");
  for await (const chunk of result.textStream) {
    fullText += chunk;
    emit({ type: "delta", content: chunk });
  }
  console.log("[processor] Text stream complete, fullText length:", fullText.length);

  const responseMessages = await result.response;
  const allMessages: ModelMessage[] = [
    ...messages,
    ...responseMessages.messages as ModelMessage[],
  ];

  emit({ type: "done", content: fullText });

  return {
    assistantMessage: fullText,
    messages: allMessages,
  };
}
