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
- Projects: `gid`
- Tasks: `gid`
- Users: `gid`
- Workspaces: `gid`

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

## Key Endpoints

See individual skill files:
- `asana/tasks` - Task operations
- `asana/projects` - Project operations (to be created)
- `asana/workspaces` - Workspace operations (to be created)
