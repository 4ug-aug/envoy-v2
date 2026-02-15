/**
 * Wrapper for OpenAI/Anthropic SDKs.
 * Configure via env: OPENAI_API_KEY or ANTHROPIC_API_KEY; default to OpenAI when available.
 */

export type LLMMessage = { role: "user" | "assistant" | "system"; content: string };

export type LLMOptions = {
  model?: string;
  temperature?: number;
};

export type LLMResult = {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
};

/**
 * Call the configured LLM with the given messages.
 * TODO: Add OpenAI and Anthropic implementations; stream callback for SSE.
 */
export async function callLLM(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<LLMResult> {
  const { model = "gpt-4o-mini", temperature = 0.7 } = options;

  // Placeholder: replace with real OpenAI/Anthropic client
  if (process.env.OPENAI_API_KEY) {
    return callOpenAI(messages, { model, temperature });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return callAnthropic(messages, { model: model || "claude-3-5-haiku-20241022", temperature });
  }

  return {
    content: "[No LLM configured: set OPENAI_API_KEY or ANTHROPIC_API_KEY]",
  };
}

async function callOpenAI(
  messages: LLMMessage[],
  opts: { model: string; temperature: number }
): Promise<LLMResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: opts.temperature,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  return {
    content: data.choices[0]?.message?.content ?? "",
    usage: data.usage,
  };
}

async function callAnthropic(
  messages: LLMMessage[],
  opts: { model: string; temperature: number }
): Promise<LLMResult> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const chatMessages = messages.filter((m) => m.role !== "system");

  const res = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: 4096,
        system,
        messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
        temperature: opts.temperature,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    content: Array<{ text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };
  const content = data.content?.map((c) => c.text).join("") ?? "";
  return {
    content,
    usage: data.usage
      ? { prompt_tokens: data.usage.input_tokens, completion_tokens: data.usage.output_tokens }
      : undefined,
  };
}
