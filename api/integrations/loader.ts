/**
 * Loads enabled integration tools from the DB and wraps them as AI SDK tools.
 * Tool names use format: {integration_name}_{tool_name} (no custom_ prefix).
 */

import { tool, jsonSchema } from "ai";
import { listEnabledIntegrations, getIntegrationTools } from "./store";
import { executeCustomTool } from "../tools/custom-executor";
import { parseToolSchema } from "../tools/schema-utils";

export function getIntegrationToolSet(): Record<string, any> {
  const tools: Record<string, any> = {};

  for (const integration of listEnabledIntegrations()) {
    const integrationTools = getIntegrationTools(integration.id);

    for (const ct of integrationTools) {
      if (!ct.enabled) continue;

      const name = `${integration.name}_${ct.name}`;

      const schema = parseToolSchema(ct.input_schema, name);
      if (!schema) continue;

      const inputSchema = jsonSchema<Record<string, unknown>>(schema as any);
      const code = ct.code;

      tools[name] = tool({
        description: `[${integration.name}] ${ct.description}`,
        inputSchema,
        execute: async (input) => {
          return executeCustomTool(code, input);
        },
      });
    }
  }

  return tools;
}
