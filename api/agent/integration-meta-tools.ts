/**
 * Meta-tools that let the agent create, manage integrations (grouped tool sets).
 * Uses jsonSchema() instead of Zod (Zod v4 compatibility).
 */

import { tool, jsonSchema } from "ai";
import {
  createIntegration,
  deleteIntegration,
  listIntegrations,
  getIntegrationByName,
  getIntegrationTools,
  type ConfigField,
} from "../integrations/store";
import { createTool, getToolByName, deleteTool } from "../tools/custom-store";
import { isConfigured } from "../integrations/env-manager";

export const integrationMetaTools = {
  create_integration: tool({
    description: `Create a new integration — a named group of related tools (e.g. "asana", "github").
Specify config_schema to declare which environment variables (API keys, tokens) the integration needs.
After creating, use add_integration_tool to add tools to it.`,
    inputSchema: jsonSchema<{
      name: string;
      description: string;
      config_schema: ConfigField[];
    }>({
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Integration name (lowercase, underscores). Used as tool name prefix.",
        },
        description: {
          type: "string",
          description: "What this integration connects to.",
        },
        config_schema: {
          type: "array",
          description: "Required environment variables for this integration.",
          items: {
            type: "object",
            properties: {
              key: { type: "string", description: 'Env var name, e.g. "ASANA_TOKEN"' },
              label: { type: "string", description: 'Human-readable label, e.g. "API Token"' },
              required: { type: "boolean", description: "Whether this variable is required." },
            },
            required: ["key", "label", "required"],
          },
        },
      },
      required: ["name", "description", "config_schema"],
    }),
    execute: async ({
      name,
      description,
      config_schema,
    }: {
      name: string;
      description: string;
      config_schema: ConfigField[];
    }) => {
      if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        return "Error: Integration name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores.";
      }

      if (getIntegrationByName(name)) {
        return `Error: An integration named "${name}" already exists.`;
      }

      try {
        const integration = createIntegration({ name, description, config_schema });
        const configured = isConfigured(config_schema);
        return `Integration "${name}" created (id: ${integration.id}). Config status: ${configured ? "configured" : "needs setup — user must set credentials in the Integrations panel"}. Use add_integration_tool to add tools.`;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return `Error creating integration: ${message}`;
      }
    },
  }),

  add_integration_tool: tool({
    description: `Add a tool to an existing integration. The tool will be available as {integration_name}_{tool_name}.
Code runs as an async function body with: input, fetch, env (process.env).`,
    inputSchema: jsonSchema<{
      integration_name: string;
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
      code: string;
    }>({
      type: "object",
      properties: {
        integration_name: {
          type: "string",
          description: "Name of the integration to add the tool to.",
        },
        name: {
          type: "string",
          description: "Tool name (lowercase, underscores). Will be prefixed with integration name.",
        },
        description: {
          type: "string",
          description: "What the tool does.",
        },
        input_schema: {
          type: "object",
          description: "JSON Schema for tool input.",
        },
        code: {
          type: "string",
          description: "Async function body. Has access to input, fetch, env. Must return a value.",
        },
      },
      required: ["integration_name", "name", "description", "input_schema", "code"],
    }),
    execute: async ({
      integration_name,
      name,
      description,
      input_schema,
      code,
    }: {
      integration_name: string;
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
      code: string;
    }) => {
      if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        return "Error: Tool name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores.";
      }

      const integration = getIntegrationByName(integration_name);
      if (!integration) {
        return `Error: No integration found with name "${integration_name}". Create it first with create_integration.`;
      }

      if (getToolByName(name)) {
        return `Error: A tool named "${name}" already exists.`;
      }

      // Validate input_schema is a JSON Schema object, not an array
      if (Array.isArray(input_schema)) {
        return "Error: input_schema must be a JSON Schema object (e.g. { \"type\": \"object\", \"properties\": {} }), not an array.";
      }

      // Validate code syntax
      try {
        new Function("input", "fetch", "env", `"use strict";\nreturn (async () => {\n${code}\n})();`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return `Error: Code has a syntax error: ${message}`;
      }

      try {
        const ct = createTool({
          name,
          description,
          input_schema: JSON.stringify(input_schema),
          code,
          integration_id: integration.id,
        });
        return `Tool "${name}" added to integration "${integration_name}" (id: ${ct.id}). Available as "${integration_name}_${name}" in the next turn.`;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return `Error adding tool: ${message}`;
      }
    },
  }),

  remove_integration_tool: tool({
    description: "Remove a single tool from an integration.",
    inputSchema: jsonSchema<{ integration_name: string; tool_name: string }>({
      type: "object",
      properties: {
        integration_name: { type: "string", description: "Integration name." },
        tool_name: { type: "string", description: "Tool name to remove." },
      },
      required: ["integration_name", "tool_name"],
    }),
    execute: async ({
      integration_name,
      tool_name,
    }: {
      integration_name: string;
      tool_name: string;
    }) => {
      const integration = getIntegrationByName(integration_name);
      if (!integration) {
        return `Error: No integration found with name "${integration_name}".`;
      }

      const tool = getToolByName(tool_name);
      if (!tool || tool.integration_id !== integration.id) {
        return `Error: No tool named "${tool_name}" found in integration "${integration_name}".`;
      }

      deleteTool(tool_name);
      return `Tool "${tool_name}" removed from integration "${integration_name}".`;
    },
  }),

  delete_integration: tool({
    description: "Delete an integration and all its tools (CASCADE).",
    inputSchema: jsonSchema<{ name: string }>({
      type: "object",
      properties: {
        name: { type: "string", description: "Integration name to delete." },
      },
      required: ["name"],
    }),
    execute: async ({ name }: { name: string }) => {
      const deleted = deleteIntegration(name);
      if (!deleted) {
        return `Error: No integration found with name "${name}".`;
      }
      return `Integration "${name}" and all its tools have been deleted.`;
    },
  }),

  list_integrations: tool({
    description: "List all integrations with their tools and configuration status.",
    inputSchema: jsonSchema<{}>({
      type: "object",
      properties: {},
    }),
    execute: async () => {
      const integrations = listIntegrations();
      if (integrations.length === 0) {
        return "No integrations have been created yet.";
      }

      return integrations
        .map((i) => {
          const configSchema: ConfigField[] = JSON.parse(i.config_schema);
          const configured = isConfigured(configSchema);
          const tools = getIntegrationTools(i.id);
          const toolList = tools.length > 0
            ? tools.map((t) => `    - ${t.name}: ${t.description}`).join("\n")
            : "    (no tools)";
          return `- ${i.name}: ${i.description} [${i.enabled ? "enabled" : "disabled"}] [${configured ? "configured" : "needs setup"}]\n  Tools:\n${toolList}`;
        })
        .join("\n\n");
    },
  }),
};
