/**
 * Configurable LLM provider.
 * Uses native @ai-sdk/openai for OpenAI endpoints, @ai-sdk/openai-compatible for others.
 *
 * Env vars:
 *   LLM_API_KEY   — API key for the provider
 *   LLM_BASE_URL  — API base URL (default: https://openrouter.ai/api/v1)
 *   LLM_MODEL     — Model identifier (default: anthropic/claude-sonnet-4)
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const baseURL = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";
const apiKey = process.env.LLM_API_KEY ?? "";

const provider = createOpenAICompatible({
  name: "llm",
  baseURL,
  apiKey,
});

export function getModel() {
  const modelId = process.env.LLM_MODEL ?? "anthropic/claude-sonnet-4";
  return provider(modelId);
}
