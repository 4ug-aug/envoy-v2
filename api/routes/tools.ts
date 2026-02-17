/**
 * GET /tools — list built-in and custom tools
 * DELETE /tools/:name — delete a custom tool
 */

import { Hono } from "hono";
import { listTools, deleteTool, getToolByName } from "../tools/custom-store";

const BUILT_IN_TOOLS = [
  { name: "read_file", description: "Read the contents of a file from the filesystem." },
  { name: "write_file", description: "Write content to a file on the filesystem." },
  { name: "list_dir", description: "List files and directories within a path." },
  { name: "create_tool", description: "Create a new custom tool and store it in the database." },
  { name: "update_tool", description: "Update an existing custom tool's code or metadata." },
  { name: "delete_tool", description: "Delete a custom tool from the database." },
  { name: "list_tools", description: "List all available custom tools." },
  { name: "test_tool", description: "Test a custom tool by running it with sample inputs." },
  { name: "search_web", description: "Search the web for information." },
  { name: "schedule_task", description: "Schedule a task to run on a cron schedule." },
  { name: "update_scheduled_task", description: "Update a scheduled task's description, cron, or enabled status." },
  { name: "delete_scheduled_task", description: "Delete a scheduled task from the database." },
  { name: "list_scheduled_tasks", description: "List all scheduled tasks." },
];

const BUILT_IN_NAMES = new Set(BUILT_IN_TOOLS.map((t) => t.name));

const tools = new Hono();

tools.get("/", (c) => {
  const custom = listTools();
  return c.json({ builtIn: BUILT_IN_TOOLS, custom });
});

tools.delete("/:name", (c) => {
  const name = c.req.param("name");

  if (BUILT_IN_NAMES.has(name)) {
    return c.json({ error: "Cannot delete built-in tools" }, 400);
  }

  const existing = getToolByName(name);
  if (!existing) {
    return c.json({ error: `Tool '${name}' not found` }, 404);
  }

  deleteTool(name);
  return c.json({ success: true });
});

export default tools;
