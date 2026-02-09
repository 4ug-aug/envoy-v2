/**
 * Skill System Types
 * 
 * Skills are markdown files that contain knowledge about APIs, patterns, and procedures.
 * The agent loads skills to learn how to interact with external systems.
 */

export interface Skill {
  /** Skill path (e.g., "asana/tasks" maps to /skills/asana/tasks.md) */
  path: string;
  
  /** Raw markdown content */
  content: string;
  
  /** Extracted title from first # heading */
  title: string;
  
  /** Category (first path segment, e.g., "asana") */
  category: string;
  
  /** Full file path on disk */
  filePath: string;
}

export interface SkillMetadata {
  /** Skill path */
  path: string;
  
  /** Skill title */
  title: string;
  
  /** Category */
  category: string;
  
  /** Brief description (extracted from content if available) */
  description?: string;
}

export interface HttpResponse {
  /** HTTP status code */
  status: number;
  
  /** Response headers */
  headers: Record<string, string>;
  
  /** Response body (parsed JSON if applicable, otherwise string) */
  body: any;
  
  /** Whether the request was successful (2xx status) */
  ok: boolean;
}

export interface HttpRequestParams {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  
  /** Full URL */
  url: string;
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Request body (will be JSON stringified if object) */
  body?: any;
  
  /** Query parameters */
  params?: Record<string, string>;
}
