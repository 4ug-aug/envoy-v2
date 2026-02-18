/**
 * Loads enabled custom tools from the DB and wraps them as AI SDK tools.
 * Tool names are prefixed with `custom_` to avoid collisions with built-in tools.
 */

import { tool, jsonSchema } from "ai";
import { listEnabledTools } from "./custom-store";
import { executeCustomTool } from "./custom-executor";
import { parseToolSchema } from "./schema-utils";

export function getCustomTools(): Record<string, any> {
  const tools: Record<string, any> = {};

  for (const ct of listEnabledTools().filter((t) => !t.integration_id)) {
    const name = `custom_${ct.name}`;

    const schema = parseToolSchema(ct.input_schema, ct.name);
    if (!schema) continue;

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
