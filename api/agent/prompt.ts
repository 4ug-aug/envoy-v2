/**
 * System prompts and context building for the agent.
 */

export const SYSTEM_PROMPT = `You are Envoy, a helpful assistant with access to tools.
Use the tools when needed to fulfill the user's request. Be concise and accurate.`;

export type Message = { role: "user" | "assistant" | "system"; content: string };

/**
 * Build the messages array sent to the LLM (system + compact history + latest user message).
 */
export function buildContext(opts: {
  systemPrompt?: string;
  history: Message[];
  userMessage: string;
}): Message[] {
  const system: Message = {
    role: "system",
    content: opts.systemPrompt ?? SYSTEM_PROMPT,
  };
  const messages: Message[] = [system, ...opts.history];
  messages.push({ role: "user", content: opts.userMessage });
  return messages;
}
