/**
 * Envoy Agent - Self-learning API agent with skills
 * 
 * Uses LangGraph with tool calling to interact with any API.
 */

import {
  StateSchema,
  MessagesValue,
  GraphNode,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";
import { createLLM, getConfigDisplay } from "../../lib/llm-config";
import { SystemMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "./prompts";
import { httpRequestTool } from "./tools/http";
import { loadSkillTool, createSkillTool, listSkillsTool } from "./tools/skills";

// Define the state schema with messages
const State = new StateSchema({
  messages: MessagesValue,
});

// Create the LLM instance with tool binding
const llm = createLLM();

// Bind all tools to the LLM
const tools = [httpRequestTool, loadSkillTool, createSkillTool, listSkillsTool];
const llmWithTools = llm ? llm.bindTools(tools) : null;

/**
 * Agent node - calls LLM with tools
 */
const agentNode: GraphNode<typeof State> = async (state) => {
  if (!llmWithTools) {
    return {
      messages: [
        {
          role: "ai",
          content: "Error: No LLM configured. Please set LLM_PROVIDER and LLM_API_KEY environment variables.",
        },
      ],
    };
  }

  try {
    // Get system prompt (includes available skills)
    const systemPrompt = await getSystemPrompt();

    // Create messages array with system prompt
    const messages = [new SystemMessage(systemPrompt), ...state.messages];

    // Invoke the LLM with tools
    const response = await llmWithTools.invoke(messages);

    return {
      messages: [response],
    };
  } catch (error) {
    console.error("Error in agent node:", error);
    return {
      messages: [
        {
          role: "ai",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
};

/**
 * Tool execution node - executes tool calls from LLM
 */
const toolNode: GraphNode<typeof State> = async (state) => {
  const lastMessage = state.messages[state.messages.length - 1];

  // Check if message has tool calls
  if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    // No tool calls, just continue
    return { messages: [] };
  }

  // Execute all tool calls
  const toolMessages = await Promise.all(
    lastMessage.tool_calls.map(async (toolCall: any) => {
      const tool = tools.find((t) => t.name === toolCall.name);

      if (!tool) {
        return {
          role: "tool",
          content: `Error: Tool ${toolCall.name} not found`,
          tool_call_id: toolCall.id,
        };
      }

      try {
        const result = await tool.invoke(toolCall.args);
        return {
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        };
      } catch (error) {
        return {
          role: "tool",
          content: `Error executing tool: ${error instanceof Error ? error.message : "Unknown error"}`,
          tool_call_id: toolCall.id,
        };
      }
    })
  );

  return {
    messages: toolMessages,
  };
};

/**
 * Router function - decides whether to continue or end
 */
function shouldContinue(state: typeof State.State): "tools" | "end" {
  const lastMessage = state.messages[state.messages.length - 1];

  // If the last message has tool calls, route to tools
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }

  // Otherwise, end the conversation
  return "end";
}

// Build the agent graph
const envoyGraph = new StateGraph(State)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "agent")
  .compile();

/**
 * Invoke the Envoy agent
 */
export async function invokeEnvoy(userMessage: string) {
  const result = await envoyGraph.invoke({
    messages: [{ role: "user", content: userMessage }],
  });
  return result;
}

/**
 * Stream the Envoy agent execution
 * Returns an async iterator of [mode, chunk] tuples
 */
export async function* streamEnvoy(userMessage: string) {
  // Use multiple stream modes to get both updates and LLM tokens
  const stream = await envoyGraph.stream(
    {
      messages: [{ role: "user", content: userMessage }],
    },
    {
      streamMode: ["updates", "messages"],
    }
  );

  for await (const chunk of stream) {
    yield chunk;
  }
}

// Log the current configuration on module load
console.log(`🤖 Envoy Agent initialized with ${getConfigDisplay()}`);

export { envoyGraph };
