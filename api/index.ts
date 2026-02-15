import { Hono } from "hono";
import V1Routes from "./v1/index";

const API = new Hono();
API.route("/v1", V1Routes);

export default API;