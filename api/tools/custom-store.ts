/**
 * CRUD operations for custom tools stored in SQLite.
 */

import { getDb } from "../db/client";

export type CustomTool = {
  id: string;
  name: string;
  description: string;
  input_schema: string;
  code: string;
  enabled: number;
  created_at: number;
  updated_at: number;
};

export type CreateToolInput = {
  name: string;
  description: string;
  input_schema: string;
  code: string;
};

export type UpdateToolInput = {
  description?: string;
  input_schema?: string;
  code?: string;
  enabled?: number;
};

export function createTool(input: CreateToolInput): CustomTool {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  db.run(
    "INSERT INTO custom_tools (id, name, description, input_schema, code, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
    [id, input.name, input.description, input.input_schema, input.code, now, now]
  );
  return {
    id,
    name: input.name,
    description: input.description,
    input_schema: input.input_schema,
    code: input.code,
    enabled: 1,
    created_at: now,
    updated_at: now,
  };
}

export function updateTool(name: string, updates: UpdateToolInput): CustomTool | null {
  const db = getDb();
  const existing = getToolByName(name);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.input_schema !== undefined) {
    fields.push("input_schema = ?");
    values.push(updates.input_schema);
  }
  if (updates.code !== undefined) {
    fields.push("code = ?");
    values.push(updates.code);
  }
  if (updates.enabled !== undefined) {
    fields.push("enabled = ?");
    values.push(updates.enabled);
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = ?");
  values.push(Date.now());
  values.push(name);

  db.run(`UPDATE custom_tools SET ${fields.join(", ")} WHERE name = ?`, values as any);
  return getToolByName(name);
}

export function deleteTool(name: string): boolean {
  const db = getDb();
  const result = db.run("DELETE FROM custom_tools WHERE name = ?", [name]);
  return result.changes > 0;
}

export function getTool(id: string): CustomTool | null {
  const db = getDb();
  return db.query<CustomTool, [string]>("SELECT * FROM custom_tools WHERE id = ?").get(id) ?? null;
}

export function getToolByName(name: string): CustomTool | null {
  const db = getDb();
  return db.query<CustomTool, [string]>("SELECT * FROM custom_tools WHERE name = ?").get(name) ?? null;
}

export function listTools(): CustomTool[] {
  const db = getDb();
  return db.query<CustomTool, []>("SELECT * FROM custom_tools ORDER BY created_at DESC").all();
}

export function listEnabledTools(): CustomTool[] {
  const db = getDb();
  return db.query<CustomTool, []>("SELECT * FROM custom_tools WHERE enabled = 1 ORDER BY created_at DESC").all();
}
