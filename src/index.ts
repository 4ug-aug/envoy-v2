import { serve } from "bun";
import { Hono } from "hono";
import index from "./index.html";
import API from "../api/index";

const app = new Hono();
app.route("/api/", API);

const server = serve({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  routes: {
    "/api/*": app.fetch,  // Hono API routes
    "/*": index,          // React app (Bun HTML import with HMR)
  },
  development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url}`);