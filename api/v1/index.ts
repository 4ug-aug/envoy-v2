import { Hono } from "hono";
import chatRoutes from "../routes/chat";
import eventsRoutes from "../routes/events";

const V1Routes = new Hono();

V1Routes.get("/", (c) => c.json({ message: "Welcome to V1" }));
V1Routes.route("/chat", chatRoutes);
V1Routes.route("/events", eventsRoutes);

export default V1Routes;