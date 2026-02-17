/**
 * GET /tasks — list all scheduled tasks with latest run info
 * GET /tasks/:name/runs — get run history for a task
 * DELETE /tasks/:name — delete a scheduled task
 */

import { Hono } from "hono";
import { listTasks, getTaskByName, deleteTask, getLatestRun, getTaskRuns, type TaskRun } from "../tasks/store";
import { unscheduleTask } from "../tasks/scheduler";

/** Parse the output JSON column into a structured array, falling back to null. */
function parseRunOutput(run: TaskRun) {
  let output = null;
  if (run.output) {
    try { output = JSON.parse(run.output); } catch {}
  }
  return { ...run, output };
}

const tasks = new Hono();

tasks.get("/", (c) => {
  const allTasks = listTasks();
  const tasksWithRuns = allTasks.map((task) => {
    const lastRun = getLatestRun(task.id);
    return {
      ...task,
      lastRun: lastRun ? parseRunOutput(lastRun) : null,
    };
  });
  return c.json({ tasks: tasksWithRuns });
});

tasks.get("/:name/runs", (c) => {
  const name = c.req.param("name");
  const task = getTaskByName(name);
  if (!task) {
    return c.json({ error: `Task '${name}' not found` }, 404);
  }

  const limit = parseInt(c.req.query("limit") ?? "10", 10);
  const runs = getTaskRuns(task.id, limit).map(parseRunOutput);
  return c.json({ task, runs });
});

tasks.delete("/:name", (c) => {
  const name = c.req.param("name");
  const task = getTaskByName(name);
  if (!task) {
    return c.json({ error: `Task '${name}' not found` }, 404);
  }

  unscheduleTask(task.id);
  deleteTask(name);
  return c.json({ success: true });
});

export default tasks;
