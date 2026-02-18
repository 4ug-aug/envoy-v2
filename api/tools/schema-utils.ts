/**
 * Normalizes a parsed input_schema value into a valid JSON Schema object.
 * Guards against arrays, primitives, and missing `type` that cause API errors.
 */
export function normalizeToolSchema(parsed: unknown): Record<string, unknown> {
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return { type: "object", properties: {} };
  }

  const schema = parsed as Record<string, unknown>;
  if (!schema.type) {
    schema.type = "object";
  }

  return schema;
}

/**
 * Parse input_schema from a DB string and normalize it.
 * Returns null if parsing fails.
 */
export function parseToolSchema(
  raw: string,
  toolName: string
): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[tool-loader] Invalid JSON in input_schema for "${toolName}", skipping.`);
    return null;
  }

  const schema = normalizeToolSchema(parsed);
  if (schema !== parsed) {
    console.warn(
      `[tool-loader] input_schema for "${toolName}" was not a JSON Schema object — using empty schema.`
    );
  }

  return schema;
}
