/**
 * Dynamic system prompt for the agent.
 * Lists available custom tools so the agent knows what's available.
 */

import { listEnabledTools } from "../tools/custom-store";
import { listEnabledTasks } from "../tasks/store";
import { listEnabledIntegrations, getIntegrationTools, type ConfigField } from "../integrations/store";
import { isConfigured } from "../integrations/env-manager";

const BASE_PROMPT = `You are Envoy, a helpful coding assistant with access to tools.

You have the following built-in tools available:
- read_file: Read the contents of a file
- write_file: Write content to a file
- list_dir: List directory contents
- search_web: Search the web for information

You can also create, manage, and test custom tools:
- create_tool: Create a new custom tool (write JS code that becomes a tool)
- update_tool: Modify an existing custom tool
- delete_tool: Remove a custom tool
- list_tools: List all custom tools
- test_tool: Test a custom tool with sample input

When creating tools, the code runs as an async function body with these variables:
- input: the parsed parameters (matching the input_schema you define)
- fetch: for HTTP requests
- env: process.env for secrets (e.g. env.API_KEY)

The code must return a value. Always test tools after creating them.

You can create and manage integrations (named groups of related tools for external services):
- create_integration: Create a new integration with name, description, and required config (env vars)
- add_integration_tool: Add a tool to an existing integration
- remove_integration_tool: Remove a tool from an integration
- delete_integration: Delete an integration and all its tools
- list_integrations: List all integrations with their tools and config status

When creating an integration, define the required environment variables (e.g. API tokens) in config_schema.
Users configure credentials via the Integrations panel in the UI.
Integration tools are named {integration_name}_{tool_name}.

You can also create and manage scheduled tasks:
- schedule_task: Create a task that runs on a cron schedule (fires the agent loop)
- update_scheduled_task: Update a task's description, cron, or enabled status
- delete_scheduled_task: Remove a scheduled task
- list_scheduled_tasks: List all scheduled tasks

When the user asks about files or directories, use the appropriate tools to help them.
Be concise and accurate. When showing file contents, format them clearly.`;

export function getSystemPrompt(): string {
  let prompt = BASE_PROMPT;

  // Show integrations with their tools and config status
  const integrations = listEnabledIntegrations();
  if (integrations.length > 0) {
    const integrationList = integrations
      .map((i) => {
        const configSchema: ConfigField[] = JSON.parse(i.config_schema);
        const configured = isConfigured(configSchema);
        const tools = getIntegrationTools(i.id);
        const toolNames = tools
          .filter((t) => t.enabled)
          .map((t) => `${i.name}_${t.name}`)
          .join(", ");
        return `- ${i.name}: ${i.description} [${configured ? "configured" : "needs setup"}]${toolNames ? ` (tools: ${toolNames})` : ""}`;
      })
      .join("\n");
    prompt += `\n\nActive integrations:\n${integrationList}`;
  }

  // Show standalone custom tools (not linked to an integration)
  const customTools = listEnabledTools().filter((t) => !t.integration_id);
  if (customTools.length > 0) {
    const toolList = customTools
      .map((t) => `- custom_${t.name}: ${t.description}`)
      .join("\n");
    prompt += `\n\nCustom tools available:\n${toolList}`;
  }

  const scheduledTasks = listEnabledTasks();
  if (scheduledTasks.length > 0) {
    const taskList = scheduledTasks
      .map((t) => `- ${t.name}: ${t.description} [cron: ${t.cron}]`)
      .join("\n");
    prompt += `\n\nActive scheduled tasks:\n${taskList}`;
  }

  return prompt;
}
