/**
 * AI SDK tool definitions wrapping existing tool implementations.
 * Uses jsonSchema() instead of Zod to avoid Zod v4 serialization issues.
 */

import { tool } from "ai";
import * as fsTools from "../tools/fs";
import * as shellTools from "../tools/shell";
import { z } from "zod";

export const agentTools = {
  read_file: tool({
    description: "Read the contents of a file. Path is relative to the sandbox root.",
    inputSchema: z.object({
      path: z.string().describe("Relative file path to read"),
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
    inputSchema: z.object({
      path: z.string().describe("Relative file path to write"),
      content: z.string().describe("Content to write"),
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
    inputSchema: z.object({
      path: z.string().describe("Relative directory path to list (defaults to '.')."),
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

  run_shell: tool({
    description:
      "Run a shell command. Only available when TOOLS_SHELL_ENABLED=true.",
    inputSchema: z.object({
      command: z.string().describe("Shell command to run"),
    }),
    execute: async ({ command }: { command: string }): Promise<string> => {
      try {
        const result = await shellTools.runCommand(command);
        const parts: string[] = [];
        if (result.stdout) parts.push(result.stdout);
        if (result.stderr) parts.push(`stderr: ${result.stderr}`);
        parts.push(`exit code: ${result.code}`);
        return parts.join("\n");
      } catch (e: unknown) {
        if (e instanceof Error) {
          return `Error running shell command: ${e.message}`;
        }
        return `Error running shell command: ${String(e)}`;
      }
    },
  }),
};
