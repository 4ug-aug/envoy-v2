import {
  StateSchema,
  MessagesValue,
  GraphNode,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";
import { createLLM, getConfigDisplay } from "../lib/llm-config";
import { SystemMessage } from "@langchain/core/messages";

// Define the state schema with messages
const State = new StateSchema({
  messages: MessagesValue,
});

// Create the LLM instance
const llm = createLLM();

// System prompt for the agent
const SYSTEM_PROMPT = `You are a helpful AI assistant powered by LangGraph. 
You are friendly, concise, and helpful. Answer questions clearly and accurately.`;

/**
 * Process message node - handles both mock and real LLM responses
 */
const processMessage: GraphNode<typeof State> = async (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  const userContent = lastMessage.content as string;

  // If no real LLM is configured, use mock responses
  if (!llm) {
    // Simple mock response logic based on user input
    let response = "I'm a simple LangGraph agent. How can I help you?";

    if (
      userContent.toLowerCase().includes("hello") ||
      userContent.toLowerCase().includes("hi")
    ) {
      response =
        "Hello! I'm a LangGraph-powered agent. Nice to meet you!";
    } else if (userContent.toLowerCase().includes("how are you")) {
      response =
        "I'm functioning well, thank you! I'm a stateful graph-based agent.";
    } else if (userContent.toLowerCase().includes("name")) {
      response =
        "I'm a LangGraph demo agent built with @langchain/langgraph!";
    }

    return { messages: [{ role: "ai", content: response }] };
  }

  // Use real LLM
  try {
    // Create messages array with system prompt
    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      ...state.messages,
    ];

    // Invoke the LLM
    const response = await llm.invoke(messages);

    return {
      messages: [
        {
          role: "ai",
          content: response.content,
        },
      ],
    };
  } catch (error) {
    console.error("Error invoking LLM:", error);
    return {
      messages: [
        {
          role: "ai",
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
};

// Build the graph
const conversationalGraph = new StateGraph(State)
  .addNode("process_message", processMessage)
  .addEdge(START, "process_message")
  .addEdge("process_message", END)
  .compile();

export async function invokeConversationalGraph(userMessage: string) {
  const result = await conversationalGraph.invoke({
    messages: [{ role: "user", content: userMessage }],
  });
  return result;
}

// Log the current configuration on module load
console.log(`🤖 LLM Configuration: ${getConfigDisplay()}`);

export { conversationalGraph };
