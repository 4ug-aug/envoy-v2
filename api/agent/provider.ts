/**
 * Configurable LLM provider.
 * Uses native @ai-sdk/openai (with built-in tools like webSearch) when
 * LLM_BASE_URL points to api.openai.com; falls back to @ai-sdk/openai-compatible
 * for OpenRouter, Ollama, LM Studio, etc.
 *
 * Env vars:
 *   LLM_API_KEY   — API key for the provider
 *   LLM_BASE_URL  — API base URL (default: https://openrouter.ai/api/v1)
 *   LLM_MODEL     — Model identifier (default: anthropic/claude-sonnet-4)
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const baseURL = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";
const apiKey = process.env.LLM_API_KEY ?? "";

const isNativeOpenAI = baseURL.includes("api.openai.com");

const openaiProvider = isNativeOpenAI
  ? createOpenAI({ apiKey, baseURL })
  : null;

const compatibleProvider = !isNativeOpenAI
  ? createOpenAICompatible({ name: "llm", baseURL, apiKey })
  : null;

export function getModel() {
  const modelId = process.env.LLM_MODEL ?? "anthropic/claude-sonnet-4";
  if (openaiProvider) return openaiProvider(modelId);
  return compatibleProvider!(modelId);
}

/**
 * Returns provider-native tools to merge into the agent's tool set.
 * Currently: webSearch when using OpenAI natively.
 */
export function getProviderTools(): Record<string, unknown> {
  if (openaiProvider) {
    return { web_search: openaiProvider.tools.webSearch() };
  }
  return {};
}
