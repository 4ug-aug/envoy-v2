/**
 * Meta-tools that let the agent create, manage, and test custom tools.
 * Uses jsonSchema() instead of Zod (Zod v4 compatibility).
 */

import { tool, jsonSchema } from "ai";
import {
  createTool,
  updateTool,
  deleteTool,
  listTools,
  getToolByName,
} from "../tools/custom-store";
import { executeCustomTool } from "../tools/custom-executor";

export const metaTools = {
  create_tool: tool({
    description: `Create a new custom tool that will be available in future turns.

The code you write is the body of an async function with these variables available:
- input: the parsed input object (matches the input_schema you define)
- fetch: the global fetch function for HTTP requests
- env: process.env object for reading secrets (e.g. env.ASANA_TOKEN)

The code MUST return a value — this is what the agent sees as the tool result.
Use standard JavaScript (no imports/require). Example:

  const res = await fetch("https://api.example.com/data", {
    headers: { Authorization: "Bearer " + env.API_KEY }
  });
  const data = await res.json();
  return data;`,
    inputSchema: jsonSchema<{
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
      code: string;
    }>({
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Tool name (lowercase, underscores). Will be prefixed with custom_ when invoked.",
        },
        description: {
          type: "string",
          description: "What the tool does — shown to the agent.",
        },
        input_schema: {
          type: "object",
          description:
            'JSON Schema for the tool input. Must be a valid JSON Schema object, e.g. { "type": "object", "properties": { "query": { "type": "string" } }, "required": ["query"] }',
        },
        code: {
          type: "string",
          description:
            "The async function body. Has access to input, fetch, env. Must return a value.",
        },
      },
      required: ["name", "description", "input_schema", "code"],
    }),
    execute: async ({
      name,
      description,
      input_schema,
      code,
    }: {
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
      code: string;
    }) => {
      // Validate name format
      if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        return "Error: Tool name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores.";
      }

      // Check for duplicates
      if (getToolByName(name)) {
        return `Error: A tool named "${name}" already exists. Use update_tool to modify it.`;
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
        });
        return `Tool "${name}" created successfully (id: ${ct.id}). It will be available as "custom_${name}" in the next turn. Use test_tool to verify it works.`;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return `Error creating tool: ${message}`;
      }
    },
  }),

  update_tool: tool({
    description: "Update an existing custom tool's description, input schema, code, or enabled status.",
    inputSchema: jsonSchema<{
      name: string;
      description?: string;
      input_schema?: Record<string, unknown>;
      code?: string;
      enabled?: boolean;
    }>({
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the tool to update." },
        description: { type: "string", description: "New description." },
        input_schema: { type: "object", description: "New JSON Schema for input." },
        code: { type: "string", description: "New function body code." },
        enabled: { type: "boolean", description: "Enable or disable the tool." },
      },
      required: ["name"],
    }),
    execute: async ({
      name,
      description,
      input_schema,
      code,
      enabled,
    }: {
      name: string;
      description?: string;
      input_schema?: Record<string, unknown>;
      code?: string;
      enabled?: boolean;
    }) => {
      // Validate code syntax if provided
      if (code !== undefined) {
        try {
          new Function("input", "fetch", "env", `"use strict";\nreturn (async () => {\n${code}\n})();`);
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          return `Error: Code has a syntax error: ${message}`;
        }
      }

      const result = updateTool(name, {
        description,
        input_schema: input_schema ? JSON.stringify(input_schema) : undefined,
        code,
        enabled: enabled !== undefined ? (enabled ? 1 : 0) : undefined,
      });

      if (!result) {
        return `Error: No tool found with name "${name}".`;
      }

      return `Tool "${name}" updated successfully. Changes take effect on the next turn.`;
    },
  }),

  delete_tool: tool({
    description: "Permanently delete a custom tool by name.",
    inputSchema: jsonSchema<{ name: string }>({
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the tool to delete." },
      },
      required: ["name"],
    }),
    execute: async ({ name }: { name: string }) => {
      const deleted = deleteTool(name);
      if (!deleted) {
        return `Error: No tool found with name "${name}".`;
      }
      return `Tool "${name}" deleted successfully.`;
    },
  }),

  list_tools: tool({
    description: "List all custom tools with their name, description, and enabled status.",
    inputSchema: jsonSchema<{}>({
      type: "object",
      properties: {},
    }),
    execute: async () => {
      const tools = listTools();
      if (tools.length === 0) {
        return "No custom tools have been created yet.";
      }

      return tools
        .map(
          (t) =>
            `- ${t.name}: ${t.description} [${t.enabled ? "enabled" : "disabled"}]`
        )
        .join("\n");
    },
  }),

  test_tool: tool({
    description:
      "Run a custom tool with test input and return the result. Use this to verify a tool works correctly after creating or updating it.",
    inputSchema: jsonSchema<{ name: string; test_input: Record<string, unknown> }>({
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the tool to test." },
        test_input: {
          type: "object",
          description: "Input object to pass to the tool.",
        },
      },
      required: ["name", "test_input"],
    }),
    execute: async ({
      name,
      test_input,
    }: {
      name: string;
      test_input: Record<string, unknown>;
    }) => {
      const ct = getToolByName(name);
      if (!ct) {
        return `Error: No tool found with name "${name}".`;
      }

      return executeCustomTool(ct.code, test_input);
    },
  }),
};
