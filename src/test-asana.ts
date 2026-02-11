/**
 * Test Asana workspace listing
 */

async function testAsana() {
  console.log("Testing Asana workspace listing...\n");

  const prompt = "List my Asana workspaces";
  console.log(`User: ${prompt}\n`);

  try {
    const response = await fetch("http://localhost:3000/api/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      // Just print tool calls to see what's happening
      if (text.includes("tool_call")) {
        console.log("Tool call detected!");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testAsana();
