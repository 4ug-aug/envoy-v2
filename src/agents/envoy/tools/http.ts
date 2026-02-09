/**
 * HTTP Request Tool
 * 
 * Generic tool for making HTTP requests to any API.
 * Returns structured response with status, headers, and body.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { HttpResponse, HttpRequestParams } from "../../../lib/skills/types";

/**
 * Make an HTTP request
 */
async function makeHttpRequest(params: HttpRequestParams): Promise<HttpResponse> {
  const { method, url, headers = {}, body, params: queryParams } = params;

  try {
    // Build URL with query parameters
    const finalUrl = new URL(url);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        finalUrl.searchParams.append(key, value);
      });
    }

    // Prepare fetch options
    const options: RequestInit = {
      method,
      headers: {
        ...headers,
      },
    };

    // Add body for POST/PUT/PATCH
    if (body && ["POST", "PUT", "PATCH"].includes(method)) {
      if (typeof body === "object") {
        options.body = JSON.stringify(body);
        if (!headers["Content-Type"] && !headers["content-type"]) {
          options.headers = {
            ...options.headers,
            "Content-Type": "application/json",
          };
        }
      } else {
        options.body = body;
      }
    }

    console.log(`🌐 ${method} ${finalUrl.toString()}`);

    // Make request
    const response = await fetch(finalUrl.toString(), options);

    // Parse response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Parse response body
    const contentType = response.headers.get("content-type") || "";
    let responseBody: any;

    if (contentType.includes("application/json")) {
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }
    } else {
      responseBody = await response.text();
    }

    const result: HttpResponse = {
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
      ok: response.ok,
    };

    if (response.ok) {
      console.log(`✅ ${response.status} ${response.statusText}`);
    } else {
      console.log(`❌ ${response.status} ${response.statusText}`);
    }

    return result;
  } catch (error) {
    console.error("HTTP request error:", error);
    return {
      status: 0,
      headers: {},
      body: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      ok: false,
    };
  }
}

/**
 * HTTP Request Tool for LangChain
 */
export const httpRequestTool = tool(
  async (input) => {
    const response = await makeHttpRequest(input as HttpRequestParams);
    
    // Return formatted response for the agent
    return JSON.stringify(response, null, 2);
  },
  {
    name: "http_request",
    description: `Make HTTP requests to any API. Returns structured response with status, headers, and body.
    
Use this tool when you need to call external APIs. The tool handles:
- All HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Query parameters
- Request headers (including authentication)
- Request body (automatically JSON stringified if object)
- Response parsing (JSON or text)

The response includes:
- status: HTTP status code
- headers: Response headers
- body: Parsed response body (JSON object or string)
- ok: Boolean indicating success (2xx status)

Example usage:
- GET request: { method: "GET", url: "https://api.example.com/items", headers: { "Authorization": "Bearer token" } }
- POST request: { method: "POST", url: "https://api.example.com/items", headers: { "Authorization": "Bearer token" }, body: { "name": "New item" } }
- With query params: { method: "GET", url: "https://api.example.com/items", params: { "limit": "10", "offset": "20" } }`,
    schema: z.object({
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("HTTP method"),
      url: z.string().describe("Full URL to request"),
      headers: z.record(z.string(), z.string()).optional().describe("Request headers (e.g., Authorization, Content-Type)"),
      body: z.union([z.string(), z.record(z.string(), z.any()), z.null()]).optional().describe("Request body (will be JSON stringified if object)"),
      params: z.record(z.string(), z.string()).optional().describe("Query parameters as key-value pairs"),
    }),
  }
);
