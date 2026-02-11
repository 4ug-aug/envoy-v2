# Asana Projects

List and manage projects within Asana workspaces.

## List Projects in a Workspace

Get all projects in a specific workspace. **Use this after discovering workspaces** to find the project you want to work with.

### Endpoint
- **Method**: GET
- **URL**: `https://app.asana.com/api/1.0/workspaces/{workspace_gid}/projects`

### Authentication
```
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| workspace_gid | path | Yes | The GID of the workspace |
| opt_fields | query | No | Comma-separated fields to include |
| limit | query | No | Number of results (default 20, max 100) |
| archived | query | No | Filter by archived status (true/false) |

### Common opt_fields
- `gid` - Project ID
- `name` - Project name
- `archived` - Whether project is archived
- `color` - Project color
- `owner` - Project owner details
- `owner.name` - Owner's name
- `team` - Team information
- `team.name` - Team name
- `due_date` - Project due date
- `completed` - Whether project is completed

### Example Request

```http
GET https://app.asana.com/api/1.0/workspaces/1234567890/projects?opt_fields=gid,name,archived,owner.name&archived=false&limit=50
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

### Example Response

```json
{
  "data": [
    {
      "gid": "111111111",
      "name": "Website Redesign",
      "archived": false,
      "owner": {
        "name": "John Doe"
      }
    },
    {
      "gid": "222222222",
      "name": "Mobile App",
      "archived": false,
      "owner": {
        "name": "Jane Smith"
      }
    }
  ]
}
```

## Get a Single Project

Retrieve detailed information about a specific project.

### Endpoint
- **Method**: GET
- **URL**: `https://app.asana.com/api/1.0/projects/{project_gid}`

### Authentication
```
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| project_gid | path | Yes | The GID of the project |
| opt_fields | query | No | Comma-separated fields to include |

### Example Request

```http
GET https://app.asana.com/api/1.0/projects/111111111?opt_fields=gid,name,owner.name,notes,due_date
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

### Example Response

```json
{
  "data": {
    "gid": "111111111",
    "name": "Website Redesign",
    "owner": {
      "name": "John Doe"
    },
    "notes": "Complete redesign of corporate website",
    "due_date": "2026-03-15"
  }
}
```

## Discovery Workflow

When you need to find a project:

1. **List workspaces** - `GET /workspaces` (see asana/workspaces skill)
2. **List projects in workspace** - `GET /workspaces/{workspace_gid}/projects`
3. **Choose the project** - Identify the project by name or other criteria
4. **Use the project_gid** - For listing tasks or other project operations

## Alternative: List All Projects

You can also list all projects across all workspaces you have access to.

### Endpoint
- **Method**: GET
- **URL**: `https://app.asana.com/api/1.0/projects`

### Parameters
- `workspace` - Filter by workspace GID
- `archived` - Filter by archived status (true/false)
- `opt_fields` - Comma-separated fields to include

### Example

```http
GET https://app.asana.com/api/1.0/projects?workspace=1234567890&archived=false&opt_fields=gid,name
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

## Notes

- Projects are containers for tasks
- Each project belongs to one workspace
- Projects can be shared with teams or individuals
- The project `gid` is needed to list tasks (see asana/tasks skill)
- **Use this to discover project IDs** before working with tasks
- Filter `archived=false` to only see active projects
- Default limit is 20 results, increase for larger workspaces
