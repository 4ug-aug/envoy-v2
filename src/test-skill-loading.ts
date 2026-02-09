/**
 * Test skill loading directly
 */

import { readSkill, listSkills } from "./lib/skills/storage";

async function testSkillLoading() {
  console.log("Testing skill loading...\n");

  try {
    // Test listing skills
    console.log("1. Listing skills:");
    const skills = await listSkills();
    console.log(`Found ${skills.length} skills:`);
    skills.forEach(s => console.log(`  - ${s.path}: ${s.title}`));

    // Test reading a specific skill
    console.log("\n2. Reading asana/tasks skill:");
    const skill = await readSkill("asana/tasks");
    if (skill) {
      console.log(`✅ Loaded: ${skill.title}`);
      console.log(`   Path: ${skill.path}`);
      console.log(`   Category: ${skill.category}`);
      console.log(`   Content length: ${skill.content.length} chars`);
      console.log(`   First 100 chars: ${skill.content.substring(0, 100)}...`);
    } else {
      console.log("❌ Failed to load skill");
    }

    console.log("\n✅ Skill loading test complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testSkillLoading();
