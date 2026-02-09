import {
  StateSchema,
  MessagesValue,
  GraphNode,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const mockLlm: GraphNode<typeof State> = (state) => {
  return { messages: [{ role: "ai", content: "hello world" }] };
};

const graph = new StateGraph(State)
  .addNode("mock_llm", mockLlm)
  .addEdge(START, "mock_llm")
  .addEdge("mock_llm", END)
  .compile();

export async function invokeSimpleGraph(userMessage: string) {
  const result = await graph.invoke({
    messages: [{ role: "user", content: userMessage }],
  });
  return result;
}

export { graph };
