# Skill System

The skill system allows the agent to learn and store knowledge about APIs, patterns, and procedures.

## How It Works

1. **Skills are markdown files** - Each skill is a `.md` file containing structured knowledge
2. **Skills live in `/skills/`** - Organized by category (e.g., `asana/`, `github/`)
3. **Skills use templates** - Follow a consistent structure for endpoints, auth, examples
4. **Environment variable substitution** - Use `{ENV_VAR}` placeholders that get replaced at runtime

## Skill Structure

### Recommended Sections

- **Title** - First `# Heading` describes what the skill covers
- **Endpoints** - API endpoints with methods and URLs
- **Authentication** - How to authenticate (headers, tokens, etc.)
- **Parameters** - Query params, body fields, etc.
- **Examples** - Sample requests and responses
- **Notes** - Rate limits, special cases, tips

## Environment Variables

Skills can reference environment variables using curly brace syntax:

```
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

The agent automatically substitutes these at runtime by reading from `process.env`.

## Creating New Skills

The agent can create new skills when it learns something useful:

1. User asks about a new API
2. Agent explores documentation or experiments
3. Agent creates a skill file to remember what it learned
4. Next time, agent loads the skill instead of re-learning

## Skill Categories

Skills are organized by category (directory):

- `_index.md` - Meta skills about the skill system itself
- `http_patterns.md` - General HTTP and API patterns
- `asana/` - Asana API skills
- `github/` - GitHub API skills
- `slack/` - Slack API skills
- etc.

## Using Skills

The agent has three skill-related tools:

1. **load_skill** - Load a skill by path (e.g., `"asana/tasks"`)
2. **list_skills** - List available skills, optionally by category
3. **create_skill** - Create or update a skill file

## Best Practices

- Keep skills focused on one topic (e.g., "tasks", not "entire API")
- Include concrete examples
- Document common gotchas and edge cases
- Update skills when you learn new information
