/**
 * Minimal test to isolate the error
 */

import { invokeEnvoy } from "./agents/envoy";

async function test() {
  console.log("Testing minimal invocation...");
  
  try {
    const result = await invokeEnvoy("hello");
    console.log("Success!");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
  }
}

test();
