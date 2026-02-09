/**
 * Skill Storage Functions
 * 
 * Handles reading, writing, and listing skill files in the /skills/ directory.
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import type { Skill, SkillMetadata } from "./types";

// Skills are stored at project root
const SKILLS_DIR = join(process.cwd(), "skills");

/**
 * Substitute environment variables in content
 * Replaces {VAR_NAME} with process.env.VAR_NAME
 */
export function substituteEnvVars(content: string): string {
  return content.replace(/\{([A-Z_][A-Z0-9_]*)\}/g, (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(`⚠️  Environment variable ${varName} not found, leaving placeholder`);
      return match;
    }
    return value;
  });
}

/**
 * Extract title from markdown content (first # heading)
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

/**
 * Extract category from skill path (first segment)
 */
function extractCategory(path: string): string {
  const parts = path.split("/");
  return parts[0] || "general";
}

/**
 * Convert skill path to file path
 * e.g., "asana/tasks" -> "/path/to/project/skills/asana/tasks.md"
 */
function skillPathToFilePath(skillPath: string): string {
  return join(SKILLS_DIR, `${skillPath}.md`);
}

/**
 * Convert file path to skill path
 * e.g., "/path/to/project/skills/asana/tasks.md" -> "asana/tasks"
 */
function filePathToSkillPath(filePath: string): string {
  const relative = filePath.replace(SKILLS_DIR + "/", "");
  return relative.replace(/\.md$/, "");
}

/**
 * Read a skill file and return parsed Skill object
 */
export async function readSkill(path: string): Promise<Skill | null> {
  try {
    const filePath = skillPathToFilePath(path);
    
    if (!existsSync(filePath)) {
      return null;
    }
    
    const rawContent = await readFile(filePath, "utf-8");
    const content = substituteEnvVars(rawContent);
    const title = extractTitle(content);
    const category = extractCategory(path);
    
    return {
      path,
      content,
      title,
      category,
      filePath,
    };
  } catch (error) {
    console.error(`Error reading skill ${path}:`, error);
    return null;
  }
}

/**
 * Write a skill file
 */
export async function writeSkill(path: string, content: string): Promise<boolean> {
  try {
    const filePath = skillPathToFilePath(path);
    const dir = dirname(filePath);
    
    // Ensure directory exists
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    
    await writeFile(filePath, content, "utf-8");
    console.log(`✅ Skill written: ${path}`);
    return true;
  } catch (error) {
    console.error(`Error writing skill ${path}:`, error);
    return false;
  }
}

/**
 * List all available skills, optionally filtered by category
 */
export async function listSkills(category?: string): Promise<SkillMetadata[]> {
  try {
    if (!existsSync(SKILLS_DIR)) {
      return [];
    }
    
    const skills: SkillMetadata[] = [];
    
    async function scanDir(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith(".md")) {
          const skillPath = filePathToSkillPath(fullPath);
          const skillCategory = extractCategory(skillPath);
          
          // Filter by category if specified
          if (category && skillCategory !== category) {
            continue;
          }
          
          const content = await readFile(fullPath, "utf-8");
          const title = extractTitle(content);
          
          // Extract description (first paragraph after title)
          const descMatch = content.match(/^#.+\n+(.+)/m);
          const description = descMatch ? descMatch[1].trim() : undefined;
          
          skills.push({
            path: skillPath,
            title,
            category: skillCategory,
            description,
          });
        }
      }
    }
    
    await scanDir(SKILLS_DIR);
    
    // Sort by path
    return skills.sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    console.error("Error listing skills:", error);
    return [];
  }
}

/**
 * Check if a skill exists
 */
export async function skillExists(path: string): Promise<boolean> {
  const filePath = skillPathToFilePath(path);
  return existsSync(filePath);
}
