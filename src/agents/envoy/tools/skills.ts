/**
 * Skill Management Tools
 * 
 * Tools for loading, creating, and listing skills.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { readSkill, writeSkill, listSkills } from "../../../lib/skills/storage";

/**
 * Load a skill by path
 */
export const loadSkillTool = tool(
  async (input) => {
    const { path } = input as { path: string };
    
    const skill = await readSkill(path);
    
    if (!skill) {
      return `Skill not found: ${path}\n\nUse list_skills to see available skills.`;
    }
    
    return `# Skill: ${skill.title}\n\nPath: ${skill.path}\nCategory: ${skill.category}\n\n---\n\n${skill.content}`;
  },
  {
    name: "load_skill",
    description: `Load a skill file to learn about an API, pattern, or procedure.

Skills are markdown files containing knowledge about:
- API endpoints, authentication, parameters
- Common patterns and best practices
- Examples and usage notes

Use this tool when:
- You need to learn how to use a specific API
- You want to check authentication methods
- You need example requests/responses
- You're looking for documented procedures

The skill content will include environment variable substitutions (e.g., {ASANA_ACCESS_TOKEN} becomes the actual token).

Example: load_skill({ path: "asana/tasks" }) returns the tasks skill with endpoint details`,
    schema: z.object({
      path: z.string().describe("Skill path (e.g., 'asana/tasks', 'http_patterns', '_index')"),
    }),
  }
);

/**
 * Create or update a skill
 */
export const createSkillTool = tool(
  async (input) => {
    const { path, content } = input as { path: string; content: string };
    
    const success = await writeSkill(path, content);
    
    if (success) {
      return `✅ Skill created/updated: ${path}\n\nThe skill has been saved and can be loaded with load_skill({ path: "${path}" })`;
    } else {
      return `❌ Failed to create skill: ${path}\n\nCheck the error logs for details.`;
    }
  },
  {
    name: "create_skill",
    description: `Create or update a skill file to remember new knowledge.

Use this tool when:
- You learn something new about an API
- You discover a useful pattern or procedure
- You want to document an API for future use
- You need to update existing skill with new information

The content should be well-structured markdown with:
- Clear title (# Heading)
- Sections for endpoints, authentication, parameters
- Examples with actual requests/responses
- Notes about edge cases, rate limits, etc.

You can use {ENV_VAR} placeholders for sensitive values.

Example: create_skill({ 
  path: "github/issues", 
  content: "# GitHub Issues\\n\\n## List Issues\\n..." 
})`,
    schema: z.object({
      path: z.string().describe("Skill path (e.g., 'github/issues'). Don't include .md extension."),
      content: z.string().describe("Markdown content for the skill. Should include title, sections, examples."),
    }),
  }
);

/**
 * List available skills
 */
export const listSkillsTool = tool(
  async (input) => {
    const { category } = (input as { category?: string }) || {};
    
    const skills = await listSkills(category);
    
    if (skills.length === 0) {
      if (category) {
        return `No skills found in category: ${category}\n\nTry list_skills without a category to see all available skills.`;
      }
      return `No skills available.\n\nYou can create new skills with create_skill.`;
    }
    
    let result = category 
      ? `# Skills in category: ${category}\n\n`
      : `# Available Skills\n\n`;
    
    // Group by category
    const byCategory = skills.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    }, {} as Record<string, typeof skills>);
    
    Object.entries(byCategory).forEach(([cat, catSkills]) => {
      result += `## ${cat}\n\n`;
      catSkills.forEach((skill) => {
        result += `- **${skill.path}** - ${skill.title}`;
        if (skill.description) {
          result += `\n  ${skill.description}`;
        }
        result += `\n`;
      });
      result += `\n`;
    });
    
    result += `\nUse load_skill({ path: "..." }) to load a specific skill.`;
    
    return result;
  },
  {
    name: "list_skills",
    description: `List available skills, optionally filtered by category.

Use this tool when:
- You want to see what skills are available
- You're looking for skills in a specific category (e.g., "asana")
- You need to discover existing knowledge before creating new skills
- You want to check if a skill already exists

Returns a categorized list of skills with their paths and titles.

Examples:
- list_skills() - List all skills
- list_skills({ category: "asana" }) - List only Asana skills`,
    schema: z.object({
      category: z.string().optional().describe("Filter by category (e.g., 'asana', 'github'). Omit to list all."),
    }),
  }
);
