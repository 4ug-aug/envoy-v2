/**
 * Loads enabled custom tools from the DB and wraps them as AI SDK tools.
 * Tool names are prefixed with `custom_` to avoid collisions with built-in tools.
 */

import { tool, jsonSchema } from "ai";
import { listEnabledTools } from "./custom-store";
import { executeCustomTool } from "./custom-executor";

export function getCustomTools(): Record<string, any> {
  const tools: Record<string, any> = {};

  for (const ct of listEnabledTools()) {
    const name = `custom_${ct.name}`;
    let schema: Record<string, unknown>;

    try {
      schema = JSON.parse(ct.input_schema);
    } catch {
      console.warn(`[custom-loader] Invalid input_schema for tool "${ct.name}", skipping.`);
      continue;
    }

    if (!schema.type) {
      schema.type = "object";
    }

    const inputSchema = jsonSchema<Record<string, unknown>>(schema as any);
    const code = ct.code;

    tools[name] = tool({
      description: ct.description,
      inputSchema,
      execute: async (input) => {
        return executeCustomTool(code, input);
      },
    });
  }

  return tools;
}
