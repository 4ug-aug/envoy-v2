/**
 * Bridges the scheduler to the agent loop.
 * Each scheduled task run creates an isolated session and calls processTurn.
 * Stores the full agent messages (including tool calls/results) as JSON output.
 */

import { getTask, createTaskRun, completeTaskRun, hasRunningRun } from "./store";
import { processTurn } from "../agent/processor";
import type { ModelMessage } from "ai";

/**
 * Extract a structured output array from the raw ModelMessage[] returned by
 * processTurn. Defensively handles unknown message shapes.
 */
function extractOutput(messages: ModelMessage[]): unknown[] {
  // Skip the first user message (the scheduled task prompt)
  const steps = messages.slice(1);
  const output: unknown[] = [];

  for (const msg of steps) {
    try {
      if (msg.role === "assistant") {
        const parts = Array.isArray(msg.content)
          ? msg.content
          : typeof msg.content === "string"
            ? [{ type: "text", text: msg.content }]
            : [];
        const textParts = parts.filter((p: any) => p.type === "text" && p.text).map((p: any) => p.text);
        const toolCalls = parts
          .filter((p: any) => p.type === "tool-call")
          .map((p: any) => ({ toolName: p.toolName, args: p.args }));

        const entry: Record<string, unknown> = { role: "assistant" };
        if (textParts.length > 0) entry.content = textParts.join("");
        if (toolCalls.length > 0) entry.toolCalls = toolCalls;
        if (entry.content || entry.toolCalls) output.push(entry);
      } else if (msg.role === "tool") {
        const parts = Array.isArray(msg.content) ? msg.content : [];
        const results = parts.map((p: any) => ({
          toolName: p.toolName ?? "unknown",
          result: typeof p.result === "string" ? p.result : JSON.stringify(p.result),
        }));
        if (results.length > 0) {
          output.push({ role: "tool", results });
        }
      }
    } catch {
      // Skip malformed messages rather than crashing the whole extraction
    }
  }

  return output;
}

export async function executeScheduledTask(taskId: string): Promise<void> {
  const task = getTask(taskId);
  if (!task) {
    console.error(`[scheduler] Task ${taskId} not found, skipping execution`);
    return;
  }

  // Guard: skip if a previous run is still in progress
  if (hasRunningRun(taskId)) {
    console.warn(`[scheduler] Task "${task.name}" already has a running execution, skipping`);
    return;
  }

  const run = createTaskRun(taskId);
  const sessionId = `task-run-${run.id}`;

  console.log(`[scheduler] Executing task "${task.name}" (run: ${run.id})`);

  try {
    const result = await processTurn({
      sessionId,
      userMessage: `[Scheduled Task: ${task.name}]\n\n${task.description}`,
      history: [],
    });

    let outputJson: string | undefined;
    try {
      const output = extractOutput(result.messages);
      outputJson = JSON.stringify(output);
    } catch (e) {
      console.warn(`[scheduler] Failed to extract output for task "${task.name}":`, e);
    }

    completeTaskRun(run.id, "success", result.assistantMessage, outputJson);
    console.log(`[scheduler] Task "${task.name}" completed successfully`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    completeTaskRun(run.id, "error", message);
    console.error(`[scheduler] Task "${task.name}" failed:`, message);
  }
}
