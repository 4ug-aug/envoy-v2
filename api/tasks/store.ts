/**
 * CRUD operations for scheduled tasks and their run history.
 */

import { getDb } from "../db/client";

export type ScheduledTask = {
  id: string;
  name: string;
  description: string;
  cron: string;
  enabled: number;
  created_at: number;
  updated_at: number;
};

export type TaskRun = {
  id: string;
  task_id: string;
  status: "running" | "success" | "error";
  result: string | null;
  output: string | null;
  started_at: number;
  finished_at: number | null;
};

export type CreateTaskInput = {
  name: string;
  description: string;
  cron: string;
};

export type UpdateTaskInput = {
  description?: string;
  cron?: string;
  enabled?: number;
};

export function createTask(input: CreateTaskInput): ScheduledTask {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  db.run(
    "INSERT INTO scheduled_tasks (id, name, description, cron, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
    [id, input.name, input.description, input.cron, now, now]
  );
  return {
    id,
    name: input.name,
    description: input.description,
    cron: input.cron,
    enabled: 1,
    created_at: now,
    updated_at: now,
  };
}

export function updateTask(name: string, updates: UpdateTaskInput): ScheduledTask | null {
  const db = getDb();
  const existing = getTaskByName(name);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.cron !== undefined) {
    fields.push("cron = ?");
    values.push(updates.cron);
  }
  if (updates.enabled !== undefined) {
    fields.push("enabled = ?");
    values.push(updates.enabled);
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = ?");
  values.push(Date.now());
  values.push(name);

  db.run(`UPDATE scheduled_tasks SET ${fields.join(", ")} WHERE name = ?`, values as any);
  return getTaskByName(name);
}

export function deleteTask(name: string): boolean {
  const db = getDb();
  const result = db.run("DELETE FROM scheduled_tasks WHERE name = ?", [name]);
  return result.changes > 0;
}

export function getTask(id: string): ScheduledTask | null {
  const db = getDb();
  return db.query<ScheduledTask, [string]>("SELECT * FROM scheduled_tasks WHERE id = ?").get(id) ?? null;
}

export function getTaskByName(name: string): ScheduledTask | null {
  const db = getDb();
  return db.query<ScheduledTask, [string]>("SELECT * FROM scheduled_tasks WHERE name = ?").get(name) ?? null;
}

export function listTasks(): ScheduledTask[] {
  const db = getDb();
  return db.query<ScheduledTask, []>("SELECT * FROM scheduled_tasks ORDER BY created_at DESC").all();
}

export function listEnabledTasks(): ScheduledTask[] {
  const db = getDb();
  return db.query<ScheduledTask, []>("SELECT * FROM scheduled_tasks WHERE enabled = 1 ORDER BY created_at DESC").all();
}

// --- Task Runs ---

export function createTaskRun(taskId: string): TaskRun {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  db.run(
    "INSERT INTO task_runs (id, task_id, status, started_at) VALUES (?, ?, 'running', ?)",
    [id, taskId, now]
  );
  return { id, task_id: taskId, status: "running", result: null, output: null, started_at: now, finished_at: null };
}

export function completeTaskRun(runId: string, status: "success" | "error", result: string, output?: string): void {
  const db = getDb();
  db.run(
    "UPDATE task_runs SET status = ?, result = ?, output = ?, finished_at = ? WHERE id = ?",
    [status, result, output ?? null, Date.now(), runId]
  );
}

export function getTaskRuns(taskId: string, limit = 10): TaskRun[] {
  const db = getDb();
  return db.query<TaskRun, [string, number]>(
    "SELECT * FROM task_runs WHERE task_id = ? ORDER BY started_at DESC LIMIT ?"
  ).all(taskId, limit);
}

export function getLatestRun(taskId: string): TaskRun | null {
  const db = getDb();
  return db.query<TaskRun, [string]>(
    "SELECT * FROM task_runs WHERE task_id = ? ORDER BY started_at DESC LIMIT 1"
  ).get(taskId) ?? null;
}

export function hasRunningRun(taskId: string): boolean {
  const db = getDb();
  const row = db.query<{ count: number }, [string]>(
    "SELECT COUNT(*) as count FROM task_runs WHERE task_id = ? AND status = 'running'"
  ).get(taskId);
  return (row?.count ?? 0) > 0;
}
