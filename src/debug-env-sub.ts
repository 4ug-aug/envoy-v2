
import { readSkill, substituteEnvVars } from "./lib/skills/storage";

// Bun loads .env automatically

async function debugSkill() {
  console.log("--- Debugging Skill Substitution ---");
  
  // 1. Check Env Var availability
  const token = process.env.ASANA_ACCESS_TOKEN;
  console.log(`ASANA_ACCESS_TOKEN present: ${!!token}`);
  if (token) {
    console.log(`Token length: ${token.length}`);
    console.log(`Token start: ${token.substring(0, 5)}...`);
  } else {
    console.error("❌ ASANA_ACCESS_TOKEN is missing in process.env");
  }

  // 2. Read raw skill content
  console.log("\n--- Reading Skill 'asana/workspaces' ---");
  const skill = await readSkill("asana/workspaces");
  
  if (!skill) {
    console.error("❌ Failed to read skill 'asana/workspaces'");
    return;
  }

  // 3. Check for placeholder in content
  console.log("Checking for {ASANA_ACCESS_TOKEN} placeholder...");
  if (skill.content.includes("Authorization: Bearer {ASANA_ACCESS_TOKEN}")) {
      console.log("✅ Placeholder found in content (after readSkill, which presumably failed to substitute?)");
      // Wait, readSkill calls substituteEnvVars internally. 
      // If the placeholder is still there, substitution failed.
  } else if (skill.content.includes(token || "NEVER_MATCH")) {
      console.log("✅ Token found in content! Substitution worked.");
  } else {
      console.log("❓ Neither placeholder nor token found. Let's look at a snippet:");
      const authIndex = skill.content.indexOf("Authorization:");
      if (authIndex !== -1) {
          console.log(skill.content.substring(authIndex, authIndex + 100));
      } else {
          console.log("Could not find 'Authorization:' string in content.");
      }
  }

  // 4. Test substitution function explicitly
  console.log("\n--- Testing substituteEnvVars explicitly ---");
  const testString = "Auth: {ASANA_ACCESS_TOKEN}";
  const substituted = substituteEnvVars(testString);
  console.log(`Original: "${testString}"`);
  console.log(`Result:   "${substituted}"`);
  
  if (substituted.includes(token || "NEVER_MATCH")) {
      console.log("✅ Explicit substitution worked.");
  } else {
      console.log("❌ Explicit substitution failed.");
  }
}

debugSkill();
