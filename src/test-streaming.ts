/**
 * Test streaming endpoint
 */

async function testStreaming() {
  console.log("🧪 Testing streaming endpoint...\n");

  const prompt = "What skills do you have?";
  console.log(`User: ${prompt}\n`);

  try {
    const response = await fetch("http://localhost:3000/api/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    console.log("📡 Streaming events:\n");

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        const eventMatch = line.match(/^event: (.+)$/m);
        const dataMatch = line.match(/^data: (.+)$/m);

        if (!eventMatch || !dataMatch) continue;

        const event = eventMatch[1];
        const data = JSON.parse(dataMatch[1]);

        console.log(`[${event}]`, data);
      }
    }

    console.log("\n✅ Streaming test complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Wait for server to start
setTimeout(testStreaming, 1000);
