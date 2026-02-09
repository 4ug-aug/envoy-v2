/**
 * Test Envoy Agent
 * 
 * Run with: bun run src/test-envoy.ts
 */

import { invokeEnvoy } from "./agents/envoy";
import { readSkill, listSkills } from "./lib/skills/storage";

console.log("🧪 Testing Envoy Agent\n");
console.log("=" .repeat(60));

/**
 * Test 1: List available skills
 */
async function testListSkills() {
  console.log("\n📚 Test 1: List available skills");
  console.log("-".repeat(60));
  
  const skills = await listSkills();
  console.log(`Found ${skills.length} skills:\n`);
  
  skills.forEach((skill) => {
    console.log(`  - ${skill.path} (${skill.category})`);
    console.log(`    ${skill.title}`);
  });
}

/**
 * Test 2: Read a skill with env var substitution
 */
async function testReadSkill() {
  console.log("\n📖 Test 2: Read asana/tasks skill");
  console.log("-".repeat(60));
  
  const skill = await readSkill("asana/tasks");
  
  if (skill) {
    console.log(`Title: ${skill.title}`);
    console.log(`Category: ${skill.category}`);
    console.log(`Path: ${skill.path}`);
    console.log(`\nContent preview (first 500 chars):`);
    console.log(skill.content.substring(0, 500) + "...\n");
    
    // Check if env var was substituted
    if (skill.content.includes("{ASANA_ACCESS_TOKEN}")) {
      console.log("⚠️  Warning: ASANA_ACCESS_TOKEN not set in environment");
    } else {
      console.log("✅ Environment variables substituted");
    }
  } else {
    console.log("❌ Skill not found");
  }
}

/**
 * Test 3: Invoke Envoy with a simple question
 */
async function testSimpleQuery() {
  console.log("\n💬 Test 3: Simple query to Envoy");
  console.log("-".repeat(60));
  
  const query = "What skills do you have available?";
  console.log(`User: ${query}\n`);
  
  try {
    const result = await invokeEnvoy(query);
    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];
    const response = lastMessage.kwargs?.content || lastMessage.content;
    
    console.log(`Envoy: ${response}\n`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

/**
 * Test 4: Ask Envoy to explain the skill system
 */
async function testSkillSystemQuery() {
  console.log("\n🔍 Test 4: Ask about skill system");
  console.log("-".repeat(60));
  
  const query = "How does your skill system work?";
  console.log(`User: ${query}\n`);
  
  try {
    const result = await invokeEnvoy(query);
    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];
    const response = lastMessage.kwargs?.content || lastMessage.content;
    
    console.log(`Envoy: ${response}\n`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

/**
 * Test 5: Ask Envoy about Asana (should load skill)
 */
async function testAsanaQuery() {
  console.log("\n🎯 Test 5: Ask about Asana tasks");
  console.log("-".repeat(60));
  
  const query = "Can you show me how to list tasks in an Asana project?";
  console.log(`User: ${query}\n`);
  
  try {
    const result = await invokeEnvoy(query);
    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];
    const response = lastMessage.kwargs?.content || lastMessage.content;
    
    console.log(`Envoy: ${response}\n`);
    
    // Check if skill was loaded (tool calls in messages)
    const hasToolCalls = messages.some((msg: any) => 
      msg.tool_calls && msg.tool_calls.length > 0
    );
    
    if (hasToolCalls) {
      console.log("✅ Envoy used tools (likely loaded skills)");
    } else {
      console.log("ℹ️  No tool calls detected");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await testListSkills();
    await testReadSkill();
    await testSimpleQuery();
    await testSkillSystemQuery();
    await testAsanaQuery();
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests completed!");
    console.log("=".repeat(60) + "\n");
    
    console.log("💡 Next steps:");
    console.log("  1. Set ASANA_ACCESS_TOKEN in .env");
    console.log("  2. Start the dev server: bun run dev");
    console.log("  3. Try asking Envoy to list your Asana tasks");
    console.log("  4. Watch Envoy load skills and make API calls!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Run tests
runTests();
