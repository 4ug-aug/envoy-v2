# Skills Architecture Reference

A condensed guide to implementing the Skills pattern for AI agents with LangChain.

## What is the Skills Pattern?

The Skills pattern packages specialized capabilities as invokable "skills" that augment an agent's behavior on-demand. Skills are primarily **prompt-driven specializations** that provide progressive disclosure of domain knowledge.

### Core Concept

Instead of loading all specialized knowledge upfront, skills are loaded only when needed:

```
User → Agent → [Skill A | Skill B | Skill C] → Agent → User
```

**Inspired by:**
- [Agent Skills](https://agentskills.io/)
- [llms.txt](https://llmstxt.org/) by Jeremy Howard
- Progressive disclosure pattern

## Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Prompt-driven** | Skills are primarily defined by specialized prompts |
| **Progressive disclosure** | Skills load based on context or user needs |
| **Team distribution** | Different teams can develop skills independently |
| **Lightweight** | Simpler than full sub-agents |
| **Reference awareness** | Skills can reference scripts, templates, resources |

## When to Use Skills

✅ **Use when you need:**
- Single agent with many possible specializations
- No strict constraints between capabilities
- Different teams developing capabilities independently
- Progressive disclosure of knowledge (not everything upfront)

📋 **Common use cases:**
- **Coding assistants**: Skills for different languages/frameworks
- **Knowledge bases**: Skills for different domains
- **Creative assistants**: Skills for different content formats
- **Domain experts**: Skills for specialized topics

❌ **Don't use when:**
- Need strict workflow constraints (use workflows/routines)
- Need sub-agents with isolated state (use supervisor/handoff)
- Have simple agent with few capabilities (just use regular tools)

## Basic Implementation

### 1. Define the Skill Loader Tool

```typescript
import { tool, createAgent } from "langchain";
import * as z from "zod";

const loadSkill = tool(
  async ({ skillName }) => {
    // Load skill content from file/database/API
    const skills = {
      write_sql: {
        prompt: `You are an expert SQL developer...`,
        examples: [...],
        guidelines: [...],
      },
      review_legal_doc: {
        prompt: `You are a legal document reviewer...`,
        checklist: [...],
        terminology: {...},
      },
    };
    
    return JSON.stringify(skills[skillName] || {});
  },
  {
    name: "load_skill",
    description: `Load a specialized skill for domain-specific tasks.

Available skills:
- write_sql: Expert SQL query writer with optimization knowledge
- review_legal_doc: Legal document reviewer with compliance checklist
- debug_python: Python debugging specialist
- write_api_docs: API documentation expert

Returns the skill's prompt, context, and specialized knowledge.`,
    schema: z.object({
      skillName: z.string().describe("Name of skill to load"),
    }),
  }
);
```

### 2. Create Agent with Skill Access

```typescript
const agent = createAgent({
  model: "gpt-4",
  tools: [loadSkill],
  systemPrompt: `You are a helpful assistant with access to specialized skills.

Available skills:
- write_sql: For SQL queries and database operations
- review_legal_doc: For legal document review
- debug_python: For Python code debugging
- write_api_docs: For API documentation

When a task requires specialized knowledge, use the load_skill tool to access the appropriate skill's expertise. Once loaded, apply that skill's knowledge to the current task.`,
});
```

### 3. Invoke the Agent

```typescript
const response = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "I need to write a SQL query to find all users who signed up last month",
    },
  ],
});

// Agent will:
// 1. Recognize this is a SQL task
// 2. Call load_skill with skillName="write_sql"
// 3. Use the loaded SQL expertise to write the query
```

## Skill Storage Patterns

### Pattern 1: File-based Skills

```typescript
import { readFile } from "fs/promises";

const loadSkill = tool(
  async ({ skillName }) => {
    const skillPath = `./skills/${skillName}.md`;
    const content = await readFile(skillPath, "utf-8");
    return content;
  },
  { /* ... */ }
);
```

**File structure:**
```
skills/
├── write_sql.md
├── review_legal_doc.md
├── debug_python.md
└── write_api_docs.md
```

**Example skill file (write_sql.md):**
```markdown
# SQL Writing Expert

## Role
You are an expert SQL developer with deep knowledge of query optimization.

## Guidelines
- Always use parameterized queries
- Optimize for readability first, performance second
- Include comments explaining complex joins
- Use CTEs for complex queries

## Common Patterns
- User analytics: JOIN users ON...
- Time-based queries: WHERE created_at >= ...

## Examples
[SQL examples here...]
```

### Pattern 2: Database-backed Skills

```typescript
const loadSkill = tool(
  async ({ skillName }) => {
    const skill = await db.skills.findOne({ name: skillName });
    return skill.content;
  },
  { /* ... */ }
);
```

### Pattern 3: API-backed Skills

```typescript
const loadSkill = tool(
  async ({ skillName }) => {
    const response = await fetch(`https://skills-api.com/${skillName}`);
    return await response.json();
  },
  { /* ... */ }
);
```

## Advanced Patterns

### 1. Dynamic Tool Registration

Load skills that also register new tools dynamically:

```typescript
import { tool, createAgent } from "langchain";
import * as z from "zod";

// Track loaded skills and their tools
let loadedTools = new Map();

const loadSkillWithTools = tool(
  async ({ skillName }) => {
    if (skillName === "database_admin") {
      // Load the skill prompt
      const skillPrompt = "You are a database administrator...";
      
      // Register skill-specific tools
      const backupTool = tool(
        async ({ database }) => {
          return `Backing up ${database}...`;
        },
        {
          name: "backup_database",
          description: "Backup a database",
          schema: z.object({ database: z.string() }),
        }
      );
      
      loadedTools.set("backup_database", backupTool);
      
      return `${skillPrompt}\n\nNew tools available: backup_database`;
    }
    
    return "Skill loaded";
  },
  {
    name: "load_skill_with_tools",
    description: "Load a skill and its associated tools",
    schema: z.object({ skillName: z.string() }),
  }
);
```

### 2. Hierarchical Skills

Skills that define sub-skills in a tree structure:

```typescript
const skillHierarchy = {
  data_science: {
    prompt: "You are a data science expert...",
    subSkills: ["pandas_expert", "visualization", "statistical_analysis"],
  },
  pandas_expert: {
    prompt: "You are a pandas library expert...",
    examples: [...],
  },
  visualization: {
    prompt: "You are a data visualization expert...",
    libraries: ["matplotlib", "seaborn", "plotly"],
  },
};

const loadSkill = tool(
  async ({ skillName }) => {
    const skill = skillHierarchy[skillName];
    
    if (skill.subSkills) {
      return `${skill.prompt}\n\nAvailable sub-skills: ${skill.subSkills.join(", ")}`;
    }
    
    return skill.prompt;
  },
  {
    name: "load_skill",
    description: "Load a skill (may have sub-skills)",
    schema: z.object({ skillName: z.string() }),
  }
);
```

**Usage flow:**
1. User asks data science question
2. Agent loads "data_science" skill
3. Discovers "pandas_expert" sub-skill exists
4. Loads "pandas_expert" for specific task

### 3. Reference Awareness

Skills reference external resources that are loaded on-demand:

```typescript
const skillDefinitions = {
  api_developer: {
    prompt: `You are an API development expert.

Available references:
- /docs/api-patterns.md: Common API design patterns
- /templates/openapi.yaml: OpenAPI specification template
- /scripts/test-api.sh: API testing script

When you need detailed information about any of these, use the read_file tool to load them.`,
  },
};

const readFile = tool(
  async ({ path }) => {
    return await fs.readFile(path, "utf-8");
  },
  {
    name: "read_file",
    description: "Read a file referenced by a skill",
    schema: z.object({ path: z.string() }),
  }
);

const loadSkill = tool(
  async ({ skillName }) => {
    return skillDefinitions[skillName].prompt;
  },
  { /* ... */ }
);

const agent = createAgent({
  model: "gpt-4",
  tools: [loadSkill, readFile], // Both tools available
  systemPrompt: "You can load skills and read referenced files...",
});
```

**Progressive disclosure in action:**
1. Agent loads "api_developer" skill → Gets overview + file references
2. User asks specific question → Agent loads relevant file
3. Only loads what's needed, when it's needed

## Complete Example: Multi-Skill Agent

```typescript
import { createAgent, tool } from "langchain";
import { readFile } from "fs/promises";
import * as z from "zod";

// Define skill metadata
const skillCatalog = {
  write_sql: {
    description: "Expert SQL query writer",
    file: "./skills/write_sql.md",
  },
  review_code: {
    description: "Code review specialist",
    file: "./skills/review_code.md",
  },
  debug_python: {
    description: "Python debugging expert",
    file: "./skills/debug_python.md",
  },
  write_tests: {
    description: "Test writing specialist",
    file: "./skills/write_tests.md",
  },
};

// Skill loader tool
const loadSkill = tool(
  async ({ skillName }) => {
    const skill = skillCatalog[skillName];
    if (!skill) {
      return `Unknown skill: ${skillName}. Available: ${Object.keys(skillCatalog).join(", ")}`;
    }
    
    const content = await readFile(skill.file, "utf-8");
    return content;
  },
  {
    name: "load_skill",
    description: `Load a specialized skill for domain-specific tasks.

Available skills:
${Object.entries(skillCatalog)
  .map(([name, meta]) => `- ${name}: ${meta.description}`)
  .join("\n")}

Returns the skill's full prompt, guidelines, and examples.`,
    schema: z.object({
      skillName: z.string().describe("Name of the skill to load"),
    }),
  }
);

// Create the agent
const agent = createAgent({
  model: "gpt-4",
  tools: [loadSkill],
  systemPrompt: `You are a versatile assistant with access to specialized skills.

When a user asks for help with a specific task, determine if any of your available skills would help:
- SQL/database work → write_sql
- Code review → review_code
- Python bugs → debug_python
- Testing → write_tests

Load the appropriate skill using the load_skill tool, then apply that expertise to help the user.`,
});

// Example usage
const response = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "Can you review this Python function for bugs?",
    },
  ],
});
```

## Skills vs Other Patterns

| Pattern | Use Case | State | Complexity |
|---------|----------|-------|------------|
| **Skills** | Progressive disclosure of prompts | Shared | Low |
| **Tools** | Executable functions | Stateless | Low |
| **Workflows** | Step-by-step procedures | Enforced order | Medium |
| **Handoffs** | Sub-agent delegation | Isolated | High |
| **Supervisor** | Multi-agent coordination | Coordinated | High |

## Best Practices

### ✅ Do:
- Keep skill descriptions clear and discoverable
- Make skills focused on one domain/capability
- Include examples in skill prompts
- Use progressive disclosure (load only what's needed)
- Version your skills (especially if stored externally)
- Test skills independently

### ❌ Don't:
- Load all skills upfront (defeats the purpose)
- Mix multiple domains in one skill
- Make skills too granular (overhead not worth it)
- Forget to update skill catalog when adding new skills
- Hard-code skill content in tool definitions

## Skill File Template

```markdown
# [Skill Name]

## Role
You are a [specific role] with expertise in [domain].

## Capabilities
- [Capability 1]
- [Capability 2]
- [Capability 3]

## Guidelines
1. [Guideline 1]
2. [Guideline 2]
3. [Guideline 3]

## Common Patterns
- [Pattern 1]: [Description]
- [Pattern 2]: [Description]

## Examples

### Example 1: [Title]
**Input:** [Example input]
**Output:** [Example output]
**Explanation:** [Why this approach]

### Example 2: [Title]
**Input:** [Example input]
**Output:** [Example output]
**Explanation:** [Why this approach]

## References
- [Resource 1]: /path/to/resource1
- [Resource 2]: /path/to/resource2

When you need detailed information about these resources, use the read_file tool.

## Edge Cases
- [Edge case 1]: [How to handle]
- [Edge case 2]: [How to handle]
```

## Real-World Example: Coding Assistant

```typescript
// skills/python_expert.md
`
# Python Expert

## Role
You are a Python expert specializing in modern best practices.

## Guidelines
- Use type hints
- Follow PEP 8
- Prefer f-strings
- Use context managers
- Write docstrings

## Common Patterns
- File I/O: Use 'with' statements
- List operations: Prefer comprehensions
- Error handling: Specific exceptions

## Examples
[Examples here...]
`

// skills/typescript_expert.md
`
# TypeScript Expert

## Role
You are a TypeScript expert focusing on type safety.

## Guidelines
- Use strict mode
- Avoid 'any'
- Use interfaces for objects
- Leverage generics

## Common Patterns
- API responses: Define interfaces
- React components: Use FC<Props>
- Error handling: Custom error types

## Examples
[Examples here...]
`

// Agent implementation
const agent = createAgent({
  model: "gpt-4",
  tools: [loadSkill],
  systemPrompt: `You are a coding assistant.

Available skills:
- python_expert: Python development
- typescript_expert: TypeScript development
- sql_expert: Database queries
- testing_expert: Writing tests

Load the appropriate skill when helping with code.`,
});
```

## Progressive Disclosure Benefits

1. **Reduced context usage**: Only load relevant knowledge
2. **Faster responses**: Less processing overhead
3. **Better focus**: Agent not overwhelmed with info
4. **Scalability**: Add unlimited skills without bloating context
5. **Maintainability**: Update skills independently
6. **Team collaboration**: Different teams own different skills

## Resources

- [Full Skills Documentation](https://docs.langchain.com/oss/javascript/langchain/multi-agent/skills)
- [Deep Agents Skills](https://docs.langchain.com/oss/javascript/deepagents/skills)
- [Agent Skills](https://agentskills.io/)
- [llms.txt Pattern](https://llmstxt.org/)
- [Multi-Agent Patterns](https://docs.langchain.com/oss/javascript/langchain/multi-agent)
