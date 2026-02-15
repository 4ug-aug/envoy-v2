/**
 * Map of all available tools. Used by the agent to resolve and run tools by name.
 */

import * as fsTools from "./fs";
import * as shellTools from "./shell";

export type ToolDef = {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
};

const tools: Map<string, ToolDef> = new Map([
  [
    "read_file",
    {
      name: "read_file",
      description: "Read the contents of a file. Path is relative to the sandbox root.",
      parameters: { path: "string" },
      handler: async (args) => {
        const p = args.path as string;
        return fsTools.readFile(p);
      },
    },
  ],
  [
    "write_file",
    {
      name: "write_file",
      description: "Write content to a file. Path is relative to the sandbox root.",
      parameters: { path: "string", content: "string" },
      handler: async (args) => {
        await fsTools.writeFile(args.path as string, args.content as string);
        return { ok: true };
      },
    },
  ],
  [
    "list_dir",
    {
      name: "list_dir",
      description: "List directory contents. Path is relative to the sandbox root.",
      parameters: { path: "string" },
      handler: async (args) => fsTools.listDir((args.path as string) || "."),
    },
  ],
  [
    "run_shell",
    {
      name: "run_shell",
      description: "Run a shell command. Only available when TOOLS_SHELL_ENABLED=true.",
      parameters: { command: "string", args: "string[]" },
      handler: async (args) =>
        shellTools.runCommand(args.command as string, (args.args as string[]) ?? []),
    },
  ],
]);

export function getToolRegistry(): Map<string, ToolDef> {
  return tools;
}

export function getToolsList(): ToolDef[] {
  return Array.from(tools.values());
}
