/**
 * GET /integrations — list all integrations with tools and config status
 * POST /integrations/:name/config — save credential values to .env
 * DELETE /integrations/:name — delete integration + cascade tools
 */

import { Hono } from "hono";
import {
  listIntegrations,
  getIntegrationByName,
  getIntegrationTools,
  deleteIntegration,
  type ConfigField,
} from "../integrations/store";
import { writeEnvVars, getMaskedEnvValues, isConfigured } from "../integrations/env-manager";

const integrations = new Hono();

integrations.get("/", (c) => {
  const all = listIntegrations();
  const result = all.map((i) => {
    const configSchema: ConfigField[] = JSON.parse(i.config_schema);
    const tools = getIntegrationTools(i.id);
    const maskedValues = getMaskedEnvValues(configSchema.map((f) => f.key));
    return {
      ...i,
      config_schema: configSchema,
      tools,
      configured: isConfigured(configSchema),
      masked_values: maskedValues,
    };
  });
  return c.json(result);
});

integrations.post("/:name/config", async (c) => {
  const name = c.req.param("name");
  const integration = getIntegrationByName(name);
  if (!integration) {
    return c.json({ error: `Integration '${name}' not found` }, 404);
  }

  const body = await c.req.json<Record<string, string>>();

  // Filter to only keys defined in config_schema
  const configSchema: ConfigField[] = JSON.parse(integration.config_schema);
  const validKeys = new Set(configSchema.map((f) => f.key));
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (validKeys.has(key) && typeof value === "string" && value.trim()) {
      vars[key] = value.trim();
    }
  }

  if (Object.keys(vars).length === 0) {
    return c.json({ error: "No valid configuration values provided" }, 400);
  }

  await writeEnvVars(vars);

  const maskedValues = getMaskedEnvValues(configSchema.map((f) => f.key));
  return c.json({
    success: true,
    configured: isConfigured(configSchema),
    masked_values: maskedValues,
  });
});

integrations.delete("/:name", (c) => {
  const name = c.req.param("name");
  const integration = getIntegrationByName(name);
  if (!integration) {
    return c.json({ error: `Integration '${name}' not found` }, 404);
  }

  deleteIntegration(name);
  return c.json({ success: true });
});

export default integrations;
