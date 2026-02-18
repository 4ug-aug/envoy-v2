import { Hono } from "hono";
import chatRoutes from "../routes/chat";
import eventsRoutes from "../routes/events";
import toolsRoutes from "../routes/tools";
import tasksRoutes from "../routes/tasks";
import sessionsRoutes from "../routes/sessions";
import integrationsRoutes from "../routes/integrations";

const V1Routes = new Hono();

V1Routes.get("/", (c) => c.json({ message: "Welcome to V1" }));
V1Routes.route("/chat", chatRoutes);
V1Routes.route("/events", eventsRoutes);
V1Routes.route("/tools", toolsRoutes);
V1Routes.route("/tasks", tasksRoutes);
V1Routes.route("/sessions", sessionsRoutes);
V1Routes.route("/integrations", integrationsRoutes);

export default V1Routes;