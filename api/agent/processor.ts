/**
 * The agent loop — explicit step-by-step tool calling loop with streaming.
 * Each step calls the model once; if it calls tools we execute them and loop.
 * We keep going until the model stops calling tools (finishReason === "stop").
 */

import { streamText, type ModelMessage } from "ai";
import { getModel, getProviderTools } from "./provider";
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

const MAX_STEPS = 10;

export async function processTurn(input: ProcessInput): Promise<ProcessResult> {
  const { sessionId, userMessage, history } = input;
  console.log("[processor] processTurn called, sessionId:", sessionId, "message:", userMessage);

  let messages: ModelMessage[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const emit = (payload: unknown) => eventBus.emit(sessionId, payload);
  emit({ type: "start" });

  let fullText = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    console.log(`[processor] Step ${step + 1}/${MAX_STEPS}, messages: ${messages.length}`);

    const result = streamText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      messages,
      tools: { ...agentTools, ...getProviderTools() },
      // maxSteps: 1 — we drive the loop ourselves so the model sees tool
      // results in context on the next iteration rather than relying on the
      // SDK's internal continuation which doesn't update `messages` for us.
    });

    for await (const event of result.fullStream) {
      if (event.type === "text-delta") {
        // TextStreamPart uses `text`, not `textDelta` or `delta`
        fullText += event.text;
        emit({ type: "delta", content: event.text });
      } else if (event.type === "tool-call") {
        // TypedToolCall uses `input` for the parsed arguments
        emit({
          type: "tool_calls",
          toolCalls: [{ toolCallId: event.toolCallId, toolName: event.toolName, args: event.input }],
        });
      } else if (event.type === "tool-result") {
        emit({
          type: "tool_results",
          toolResults: [{ toolCallId: event.toolCallId, toolName: event.toolName, result: event.output }],
        });
      } else if (event.type === "error") {
        console.error("[processor] Stream error:", event.error);
      }
    }

    // Append this step's messages (assistant turn + tool results) to history
    // so the next step sees the full context.
    const { messages: stepMessages } = await result.response;
    messages = [...messages, ...(stepMessages as ModelMessage[])];

    const finishReason = await result.finishReason;
    console.log(`[processor] Step ${step + 1} finished, reason: ${finishReason}`);

    if (finishReason !== "tool-calls") {
      // Model gave a final answer (or errored / hit length limit).
      break;
    }
    // Otherwise: tool calls were made; loop and call the model again with
    // the tool results now in context.
  }

  console.log("[processor] Agent loop complete, fullText length:", fullText.length);
  emit({ type: "done", content: fullText });

  return {
    assistantMessage: fullText,
    messages,
  };
}
