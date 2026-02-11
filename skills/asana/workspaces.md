# Asana Workspaces

Discover and manage Asana workspaces and organizations.

## List Workspaces

Get all workspaces the authenticated user has access to. **This is typically the first API call** to discover available workspaces.

### Endpoint
- **Method**: GET
- **URL**: `https://app.asana.com/api/1.0/workspaces`

### Authentication
```
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| opt_fields | query | No | Comma-separated fields to include |
| limit | query | No | Number of results (default 20, max 100) |

### Common opt_fields
- `name` - Workspace name
- `gid` - Workspace ID
- `is_organization` - Whether it's an organization vs personal workspace
- `email_domains` - Allowed email domains for organization

### Example Request

```http
GET https://app.asana.com/api/1.0/workspaces?opt_fields=gid,name,is_organization
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

### Example Response

```json
{
  "data": [
    {
      "gid": "1234567890",
      "name": "My Company",
      "is_organization": true
    },
    {
      "gid": "9876543210",
      "name": "Personal Workspace",
      "is_organization": false
    }
  ]
}
```

## Get a Single Workspace

Retrieve details about a specific workspace.

### Endpoint
- **Method**: GET
- **URL**: `https://app.asana.com/api/1.0/workspaces/{workspace_gid}`

### Authentication
```
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| workspace_gid | path | Yes | The GID of the workspace |
| opt_fields | query | No | Comma-separated fields to include |

### Example Request

```http
GET https://app.asana.com/api/1.0/workspaces/1234567890?opt_fields=name,is_organization,email_domains
Authorization: Bearer {ASANA_ACCESS_TOKEN}
```

### Example Response

```json
{
  "data": {
    "gid": "1234567890",
    "name": "My Company",
    "is_organization": true,
    "email_domains": ["company.com"]
  }
}
```

## Discovery Workflow

When starting to work with Asana, follow this discovery pattern:

1. **List workspaces** - `GET /workspaces` to see available workspaces
2. **Pick a workspace** - Note the `gid` of the workspace you want to work with
3. **List projects** - `GET /workspaces/{workspace_gid}/projects` (see asana/projects skill)
4. **Pick a project** - Note the `gid` of the project
5. **List tasks** - `GET /projects/{project_gid}/tasks` (see asana/tasks skill)

## Notes

- Most users have access to at least one workspace
- Organizations may have multiple workspaces/teams
- The workspace `gid` is needed to discover projects
- **Always start here** when you don't have a project ID
- Workspaces are the top-level container in Asana's hierarchy
