# Asana Tasks

List, create, and update tasks in Asana projects.

## Get Tasks in a Project

Retrieve all tasks in a specific project.

### Endpoint
- **Method**: GET
- **URL**: `https://app.asana.com/api/1.0/projects/{project_gid}/tasks`

### Authentication
```
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| project_gid | path | Yes | The GID of the project |
| opt_fields | query | No | Comma-separated fields to include |
| limit | query | No | Number of results (default 20, max 100) |
| offset | query | No | Pagination offset token |

### Common opt_fields
- `name` - Task name
- `completed` - Boolean completion status
- `due_on` - Due date (YYYY-MM-DD)
- `assignee.name` - Assignee's name
- `notes` - Task description/notes
- `tags.name` - Tag names

### Example Request

```http
GET https://app.asana.com/api/1.0/projects/1234567890/tasks?opt_fields=name,completed,due_on,assignee.name&limit=50
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

### Example Response

```json
{
  "data": [
    {
      "gid": "1111111111",
      "name": "Implement feature X",
      "completed": false,
      "due_on": "2026-02-15",
      "assignee": {
        "name": "John Doe"
      }
    },
    {
      "gid": "2222222222",
      "name": "Review PR",
      "completed": true,
      "due_on": null,
      "assignee": {
        "name": "Jane Smith"
      }
    }
  ]
}
```

## Create a Task

Create a new task in a project.

### Endpoint
- **Method**: POST
- **URL**: `https://app.asana.com/api/1.0/tasks`

### Authentication
```
Authorization: Bearer {ASANA_ACCESS_TOKEN}
Content-Type: application/json
```

### Request Body

```json
{
  "data": {
    "name": "Task name",
    "notes": "Task description",
    "projects": ["1234567890"],
    "due_on": "2026-03-01"
  }
}
```

### Common Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Task name |
| notes | string | No | Task description |
| projects | array | No | Array of project GIDs |
| due_on | string | No | Due date (YYYY-MM-DD) |
| assignee | string | No | User GID to assign to |
| completed | boolean | No | Completion status |

### Example Request

```http
POST https://app.asana.com/api/1.0/tasks
Authorization: Bearer {ASANA_ACCESS_TOKEN}
Content-Type: application/json

{
  "data": {
    "name": "New task from Envoy",
    "notes": "Created via API",
    "projects": ["1234567890"],
    "due_on": "2026-02-20"
  }
}
```

### Example Response

```json
{
  "data": {
    "gid": "3333333333",
    "name": "New task from Envoy",
    "notes": "Created via API",
    "completed": false,
    "due_on": "2026-02-20"
  }
}
```

## Update a Task

Update an existing task.

### Endpoint
- **Method**: PUT
- **URL**: `https://app.asana.com/api/1.0/tasks/{task_gid}`

### Request Body

```json
{
  "data": {
    "completed": true,
    "notes": "Updated description"
  }
}
```

### Example

```http
PUT https://app.asana.com/api/1.0/tasks/1111111111
Authorization: Bearer {ASANA_ACCESS_TOKEN}
Content-Type: application/json

{
  "data": {
    "completed": true
  }
}
```

## Notes

- **Finding project_gid**: Get from project URL (`https://app.asana.com/0/{project_gid}/...`) or use workspaces endpoint
- **Pagination**: Use `offset` from `next_page` in response for more results
- **Rate limit**: Be mindful of 1500 req/min limit
- **opt_fields**: Always specify needed fields to reduce response size
