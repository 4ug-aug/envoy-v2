/**
 * File system tools (read, write, ls). Sandboxed to a configurable root (e.g. workspace).
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const SANDBOX_ROOT = process.env.TOOLS_FS_ROOT ?? process.cwd();

function resolvePath(relativePath: string): string {
  const resolved = path.resolve(SANDBOX_ROOT, relativePath);
  if (!resolved.startsWith(path.resolve(SANDBOX_ROOT))) {
    throw new Error("Path outside sandbox is not allowed");
  }
  return resolved;
}

export async function readFile(relativePath: string): Promise<string> {
  const p = resolvePath(relativePath);
  return fs.readFile(p, "utf-8");
}

export async function writeFile(relativePath: string, content: string): Promise<void> {
  const p = resolvePath(relativePath);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, "utf-8");
}

export async function listDir(relativePath: string): Promise<string[]> {
  const p = resolvePath(relativePath);
  const entries = await fs.readdir(p, { withFileTypes: true });
  return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
}
