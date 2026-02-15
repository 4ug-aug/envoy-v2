import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ALL_SCHEMAS } from "./schema";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/envoy.sqlite";

let db: Database | null = null;

/**
 * Get the singleton database connection.
 * Initializes and runs schema if first call.
 */
export function getDb(): Database {
  if (!db) {
    try {
      mkdirSync(dirname(DB_PATH), { recursive: true });
    } catch {
      // ignore if dir exists or path is in-memory etc.
    }
    db = new Database(DB_PATH);
    for (const sql of ALL_SCHEMAS) {
      db.run(sql);
    }
  }
  return db;
}

/**
 * Close the database connection (e.g. on shutdown).
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
