/**
 * CRUD operations for integrations stored in SQLite.
 */

import { getDb } from "../db/client";
import type { CustomTool } from "../tools/custom-store";

export type ConfigField = {
  key: string;
  label: string;
  required: boolean;
};

export type Integration = {
  id: string;
  name: string;
  description: string;
  config_schema: string;
  enabled: number;
  created_at: number;
  updated_at: number;
};

export type CreateIntegrationInput = {
  name: string;
  description: string;
  config_schema: ConfigField[];
};

export function createIntegration(input: CreateIntegrationInput): Integration {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const configSchema = JSON.stringify(input.config_schema);
  db.run(
    "INSERT INTO integrations (id, name, description, config_schema, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
    [id, input.name, input.description, configSchema, now, now]
  );
  return {
    id,
    name: input.name,
    description: input.description,
    config_schema: configSchema,
    enabled: 1,
    created_at: now,
    updated_at: now,
  };
}

export function updateIntegration(
  name: string,
  updates: { description?: string; config_schema?: ConfigField[]; enabled?: number }
): Integration | null {
  const db = getDb();
  const existing = getIntegrationByName(name);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.config_schema !== undefined) {
    fields.push("config_schema = ?");
    values.push(JSON.stringify(updates.config_schema));
  }
  if (updates.enabled !== undefined) {
    fields.push("enabled = ?");
    values.push(updates.enabled);
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = ?");
  values.push(Date.now());
  values.push(name);

  db.run(`UPDATE integrations SET ${fields.join(", ")} WHERE name = ?`, values as any);
  return getIntegrationByName(name);
}

export function deleteIntegration(name: string): boolean {
  const db = getDb();
  const result = db.run("DELETE FROM integrations WHERE name = ?", [name]);
  return result.changes > 0;
}

export function getIntegration(id: string): Integration | null {
  const db = getDb();
  return db.query<Integration, [string]>("SELECT * FROM integrations WHERE id = ?").get(id) ?? null;
}

export function getIntegrationByName(name: string): Integration | null {
  const db = getDb();
  return db.query<Integration, [string]>("SELECT * FROM integrations WHERE name = ?").get(name) ?? null;
}

export function listIntegrations(): Integration[] {
  const db = getDb();
  return db.query<Integration, []>("SELECT * FROM integrations ORDER BY created_at DESC").all();
}

export function listEnabledIntegrations(): Integration[] {
  const db = getDb();
  return db.query<Integration, []>("SELECT * FROM integrations WHERE enabled = 1 ORDER BY created_at DESC").all();
}

export function getIntegrationTools(integrationId: string): CustomTool[] {
  const db = getDb();
  return db
    .query<CustomTool, [string]>("SELECT * FROM custom_tools WHERE integration_id = ? ORDER BY created_at ASC")
    .all(integrationId);
}
