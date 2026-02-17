/**
 * Executes custom tool code in a sandboxed Function context.
 * Code receives: input (parsed params), fetch (HTTP), env (process.env).
 * Returns the result as a string, or an error message on failure.
 */

const TIMEOUT_MS = 30_000;

export async function executeCustomTool(
  code: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    const fn = new Function(
      "input",
      "fetch",
      "env",
      `"use strict";\nreturn (async () => {\n${code}\n})();`
    );

    const resultPromise = fn(input, fetch, process.env);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Tool execution timed out after 30 seconds")), TIMEOUT_MS)
    );

    const result = await Promise.race([resultPromise, timeoutPromise]);

    if (result === undefined || result === null) {
      return "Tool executed successfully (no return value).";
    }

    return typeof result === "string" ? result : JSON.stringify(result, null, 2);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return `Error executing tool: ${message}`;
  }
}
