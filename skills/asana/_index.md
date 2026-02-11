# Asana API

Overview of the Asana API for task and project management.

## Base URL

```
https://app.asana.com/api/1.0
```

All Asana API endpoints use this base URL.

## Authentication

Asana uses Bearer token authentication:

```
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

Get your token from: https://app.asana.com/0/my_apps

## Common Headers

```
Authorization: Bearer {ASANA_ACCESS_TOKEN}
Content-Type: application/json
```

## Discovery Workflow

**When you don't have specific IDs**, follow this pattern to discover what's available:

1. **Workspaces** → `GET /workspaces` (see asana/workspaces skill)
2. **Projects** → `GET /workspaces/{workspace_gid}/projects` (see asana/projects skill)
3. **Tasks** → `GET /projects/{project_gid}/tasks` (see asana/tasks skill)

**Always start with workspaces** if you need to discover available projects or tasks.

## Response Format

Asana wraps responses in a `data` field:

```json
{
  "data": {
    "gid": "123",
    "name": "Task name"
  }
}
```

For lists:

```json
{
  "data": [
    { "gid": "123", "name": "Item 1" },
    { "gid": "456", "name": "Item 2" }
  ]
}
```

## Rate Limits

- **Standard**: 1500 requests per minute
- **Premium**: Higher limits available

When rate limited, response includes:
- Status: 429
- Header: `Retry-After` (seconds to wait)

## Common Parameters

### opt_fields

Asana requires specifying which fields to return:

```
?opt_fields=name,completed,due_on,assignee.name,notes
```

This reduces response size and improves performance.

**Common opt_fields patterns:**
- `gid,name` - Basic identification
- `gid,name,completed` - With status
- `gid,name,assignee.name` - With assignee
- `gid,name,due_on,notes` - With details

### limit

Pagination limit (default 20, max 100):

```
?limit=50
```

### offset

For pagination:

```
?offset=eyJ0eXAiOiJKV1Q...
```

Asana returns `next_page.offset` in responses for pagination.

## Resource GIDs

Asana uses Global IDs (gids) for all resources:
- Workspaces: `gid` (get from `/workspaces`)
- Projects: `gid` (get from `/workspaces/{workspace_gid}/projects`)
- Tasks: `gid` (get from `/projects/{project_gid}/tasks`)
- Users: `gid`

## Error Responses

```json
{
  "errors": [
    {
      "message": "project: Missing input",
      "help": "For more information..."
    }
  ]
}
```

## Available Skills

- **asana/workspaces** - List and discover workspaces (start here!)
- **asana/projects** - List projects in a workspace
- **asana/tasks** - List, create, update tasks in a project

## Autonomous Discovery

The agent should **automatically discover** available resources:

1. When asked about Asana without specific IDs, list workspaces first
2. Present workspace options to the user or pick the first/only one
3. List projects in that workspace
4. Use project ID to work with tasks

**Don't ask the user for IDs** - discover them automatically!
