/**
 * AI SDK tool definitions for filesystem operations.
 * Uses jsonSchema() instead of Zod to avoid Zod v4 serialization issues.
 * Web search is provided by the provider natively (see provider.ts).
 */

import { tool, jsonSchema } from "ai";
import * as fsTools from "../tools/fs";

export const agentTools = {
  read_file: tool({
    description: "Read the contents of a file. Path is relative to the sandbox root.",
    inputSchema: jsonSchema<{ path: string }>({
      type: "object",
      properties: { path: { type: "string", description: "Relative file path to read" } },
      required: ["path"],
    }),
    execute: async ({ path }: { path: string }): Promise<string> => {
      try {
        return await fsTools.readFile(path);
      } catch (e: unknown) {
        if (e instanceof Error) {
          return `Error reading file: ${e.message}`;
        }
        return `Error reading file: ${String(e)}`;
      }
    },
  }),

  write_file: tool({
    description: "Write content to a file. Path is relative to the sandbox root.",
    inputSchema: jsonSchema<{ path: string; content: string }>({
      type: "object",
      properties: {
        path: { type: "string", description: "Relative file path to write" },
        content: { type: "string", description: "Content to write" },
      },
      required: ["path", "content"],
    }),
    execute: async ({ path, content }: { path: string; content: string }): Promise<string> => {
      try {
        await fsTools.writeFile(path, content);
        return `Successfully wrote to ${path}`;
      } catch (e: any) {
        return `Error writing file: ${e.message}`;
      }
    },
  }),

  list_dir: tool({
    description: "List directory contents. Path is relative to the sandbox root.",
    inputSchema: jsonSchema<{ path: string }>({
      type: "object",
      properties: { path: { type: "string", description: "Relative directory path to list (defaults to '.')." } },
      required: ["path"],
    }),
    execute: async ({ path }: { path: string }): Promise<string> => {
      try {
        const entries = await fsTools.listDir(path || ".");
        return entries.join("\n");
      } catch (e: unknown) {
        if (e instanceof Error) {
          return `Error listing directory: ${e.message}`;
        }
        return `Error listing directory: ${String(e)}`;
      }
    },
  }),
};
