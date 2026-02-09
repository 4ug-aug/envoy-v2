import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface LLMConfig {
  provider: "openai" | "anthropic" | "google" | "mock";
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Load LLM configuration from environment variables
 */
export function loadLLMConfig(): LLMConfig {
  return {
    provider: (process.env.LLM_PROVIDER || "mock") as LLMConfig["provider"],
    model: process.env.LLM_MODEL || "gpt-4",
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL,
    temperature: process.env.LLM_TEMPERATURE
      ? parseFloat(process.env.LLM_TEMPERATURE)
      : 0.7,
    maxTokens: process.env.LLM_MAX_TOKENS
      ? parseInt(process.env.LLM_MAX_TOKENS)
      : 1000,
  };
}

/**
 * Create an LLM instance based on the configuration
 */
export function createLLM(config?: LLMConfig): BaseChatModel | null {
  const llmConfig = config || loadLLMConfig();

  switch (llmConfig.provider) {
    case "openai":
      if (!llmConfig.apiKey) {
        console.warn(
          "⚠️  OpenAI API key not set. Set LLM_API_KEY environment variable."
        );
        return null;
      }
      return new ChatOpenAI({
        model: llmConfig.model,
        apiKey: llmConfig.apiKey,
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens,
        ...(llmConfig.baseURL && {
          configuration: { baseURL: llmConfig.baseURL },
        }),
      });

    case "anthropic":
      if (!llmConfig.apiKey) {
        console.warn(
          "⚠️  Anthropic API key not set. Set LLM_API_KEY environment variable."
        );
        return null;
      }
      return new ChatAnthropic({
        model: llmConfig.model,
        apiKey: llmConfig.apiKey,
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens,
        ...(llmConfig.baseURL && { clientOptions: { baseURL: llmConfig.baseURL } }),
      });

    case "google":
      if (!llmConfig.apiKey) {
        console.warn(
          "⚠️  Google API key not set. Set LLM_API_KEY environment variable."
        );
        return null;
      }
      return new ChatGoogleGenerativeAI({
        model: llmConfig.model,
        apiKey: llmConfig.apiKey,
        temperature: llmConfig.temperature,
        maxOutputTokens: llmConfig.maxTokens,
      });

    case "mock":
      console.log("🤖 Using mock LLM (no real API calls)");
      return null;

    default:
      console.warn(`⚠️  Unknown provider: ${llmConfig.provider}. Using mock.`);
      return null;
  }
}

/**
 * Get a user-friendly display of the current configuration
 */
export function getConfigDisplay(config?: LLMConfig): string {
  const llmConfig = config || loadLLMConfig();
  
  if (llmConfig.provider === "mock") {
    return "Mock LLM (no API calls)";
  }
  
  const hasKey = llmConfig.apiKey && llmConfig.apiKey.length > 0;
  return `${llmConfig.provider.toUpperCase()} - ${llmConfig.model}${hasKey ? "" : " (API key not set)"}`;
}
