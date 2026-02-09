# HTTP Patterns

Common patterns for working with HTTP APIs.

## Authentication Methods

### Bearer Token
```
Authorization: Bearer {TOKEN}
```

Most modern APIs use Bearer tokens. The token is typically stored in an environment variable.

### API Key Header
```
X-API-Key: {API_KEY}
```

Some APIs use custom headers for API keys.

### Basic Auth
```
Authorization: Basic {base64(username:password)}
```

Older APIs may use HTTP Basic Authentication.

## REST Conventions

### Common HTTP Methods

- **GET** - Retrieve resources (should be idempotent)
- **POST** - Create new resources
- **PUT** - Replace entire resource
- **PATCH** - Partially update resource
- **DELETE** - Remove resource

### Status Codes

- **2xx** - Success
  - 200 OK - Standard success
  - 201 Created - Resource created
  - 204 No Content - Success with no response body
- **4xx** - Client errors
  - 400 Bad Request - Invalid input
  - 401 Unauthorized - Missing or invalid auth
  - 403 Forbidden - Auth valid but not allowed
  - 404 Not Found - Resource doesn't exist
  - 429 Too Many Requests - Rate limited
- **5xx** - Server errors
  - 500 Internal Server Error
  - 503 Service Unavailable

## Query Parameters

Append to URL after `?`:

```
https://api.example.com/items?limit=10&offset=20&sort=name
```

Common patterns:
- `limit` / `per_page` - Pagination page size
- `offset` / `page` - Pagination offset
- `sort` / `order` - Sorting
- `filter` / `q` - Filtering/searching

## Request Body

For POST/PUT/PATCH, send data as JSON:

```json
{
  "name": "Example",
  "status": "active"
}
```

Always include header:
```
Content-Type: application/json
```

## Response Body

Most APIs return JSON:

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1
  }
}
```

Common patterns:
- `data` - The actual response payload
- `meta` / `pagination` - Metadata about the response
- `errors` - Array of error messages

## Rate Limiting

Common headers:
- `X-RateLimit-Limit` - Max requests per window
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - When limit resets (Unix timestamp)

When rate limited, APIs typically return:
- Status: 429 Too Many Requests
- Header: `Retry-After: 60` (seconds)

## Error Handling

Check `ok` field in http_request response:

```typescript
if (!response.ok) {
  // Handle error based on status code
}
```

Common issues:
- 401/403 - Check authentication
- 404 - Check URL and resource ID
- 429 - Wait and retry
- 500 - API issue, retry with backoff
