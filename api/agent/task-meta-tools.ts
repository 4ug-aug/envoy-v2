/**
 * Meta-tools for creating and managing scheduled tasks.
 * Uses jsonSchema() instead of Zod (Zod v4 compatibility).
 */

import { tool, jsonSchema } from "ai";
import { Cron } from "croner";
import {
  createTask,
  updateTask,
  deleteTask,
  listTasks,
  getTaskByName,
} from "../tasks/store";
import { scheduleTask, unscheduleTask } from "../tasks/scheduler";

export const taskMetaTools = {
  schedule_task: tool({
    description: `Create a new scheduled task that runs on a cron schedule.
When a task fires, the agent loop runs with the task description as the prompt.
Results are stored and visible in the UI.

Cron format: "sec min hour day month weekday" or standard 5-field cron.
Examples: "0 */5 * * * *" (every 5 min), "0 0 9 * * *" (daily at 9am), "0 0 * * * 1-5" (hourly on weekdays).`,
    inputSchema: jsonSchema<{
      name: string;
      description: string;
      cron: string;
    }>({
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Task name (lowercase, underscores). Must be unique.",
        },
        description: {
          type: "string",
          description: "What the task should do when it runs. This becomes the agent prompt.",
        },
        cron: {
          type: "string",
          description: "Cron expression for the schedule.",
        },
      },
      required: ["name", "description", "cron"],
    }),
    execute: async ({ name, description, cron }: { name: string; description: string; cron: string }) => {
      if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        return "Error: Task name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores.";
      }

      if (getTaskByName(name)) {
        return `Error: A task named "${name}" already exists. Use update_scheduled_task to modify it.`;
      }

      // Validate cron expression
      try {
        new Cron(cron, { maxRuns: 0 });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return `Error: Invalid cron expression: ${message}`;
      }

      try {
        const task = createTask({ name, description, cron });
        scheduleTask(task);
        return `Scheduled task "${name}" created and active. Cron: ${cron}`;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return `Error creating task: ${message}`;
      }
    },
  }),

  update_scheduled_task: tool({
    description: "Update a scheduled task's description, cron schedule, or enabled status.",
    inputSchema: jsonSchema<{
      name: string;
      description?: string;
      cron?: string;
      enabled?: boolean;
    }>({
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the task to update." },
        description: { type: "string", description: "New task description / agent prompt." },
        cron: { type: "string", description: "New cron expression." },
        enabled: { type: "boolean", description: "Enable or disable the task." },
      },
      required: ["name"],
    }),
    execute: async ({
      name,
      description,
      cron,
      enabled,
    }: {
      name: string;
      description?: string;
      cron?: string;
      enabled?: boolean;
    }) => {
      // Validate cron if provided
      if (cron !== undefined) {
        try {
          new Cron(cron, { maxRuns: 0 });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          return `Error: Invalid cron expression: ${message}`;
        }
      }

      const result = updateTask(name, {
        description,
        cron,
        enabled: enabled !== undefined ? (enabled ? 1 : 0) : undefined,
      });

      if (!result) {
        return `Error: No task found with name "${name}".`;
      }

      // Re-schedule or unschedule based on new state
      if (result.enabled) {
        scheduleTask(result);
      } else {
        unscheduleTask(result.id);
      }

      return `Task "${name}" updated successfully.`;
    },
  }),

  delete_scheduled_task: tool({
    description: "Permanently delete a scheduled task and stop its cron job.",
    inputSchema: jsonSchema<{ name: string }>({
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the task to delete." },
      },
      required: ["name"],
    }),
    execute: async ({ name }: { name: string }) => {
      const task = getTaskByName(name);
      if (!task) {
        return `Error: No task found with name "${name}".`;
      }

      unscheduleTask(task.id);
      deleteTask(name);
      return `Task "${name}" deleted and unscheduled.`;
    },
  }),

  list_scheduled_tasks: tool({
    description: "List all scheduled tasks with their name, description, cron schedule, and enabled status.",
    inputSchema: jsonSchema<{}>({
      type: "object",
      properties: {},
    }),
    execute: async () => {
      const tasks = listTasks();
      if (tasks.length === 0) {
        return "No scheduled tasks have been created yet.";
      }

      return tasks
        .map(
          (t) =>
            `- ${t.name}: ${t.description} [cron: ${t.cron}] [${t.enabled ? "enabled" : "disabled"}]`
        )
        .join("\n");
    },
  }),
};
