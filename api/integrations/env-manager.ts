/**
 * Manages .env file for integration credentials.
 * Reads/writes .env and syncs values to process.env at runtime.
 */

import type { ConfigField } from "./store";

const ENV_PATH = ".env";

export async function writeEnvVars(vars: Record<string, string>): Promise<void> {
  let content = "";
  try {
    content = await Bun.file(ENV_PATH).text();
  } catch {
    // .env doesn't exist yet
  }

  const lines = content.split("\n");

  for (const [key, value] of Object.entries(vars)) {
    const lineIndex = lines.findIndex((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith(`${key}=`) || trimmed.startsWith(`${key} =`);
    });

    const newLine = `${key}=${value}`;

    if (lineIndex >= 0) {
      lines[lineIndex] = newLine;
    } else {
      lines.push(newLine);
    }

    // Set immediately in runtime
    process.env[key] = value;
  }

  // Remove trailing empty lines, ensure single newline at end
  const result = lines.filter((line, i) => i < lines.length - 1 || line.trim() !== "").join("\n");
  await Bun.write(ENV_PATH, result.endsWith("\n") ? result : result + "\n");
}

export function getMaskedEnvValues(keys: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const key of keys) {
    const value = process.env[key];
    if (!value) {
      result[key] = null;
    } else if (value.length <= 8) {
      result[key] = "***";
    } else {
      result[key] = value.slice(0, 3) + "***" + value.slice(-3);
    }
  }
  return result;
}

export function isConfigured(configSchema: ConfigField[]): boolean {
  return configSchema
    .filter((f) => f.required)
    .every((f) => !!process.env[f.key]);
}
