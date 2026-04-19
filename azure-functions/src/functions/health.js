const { app } = require("@azure/functions");
const { json, preflight } = require("../shared/http");

app.http("health", {
  route: "health",
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req) => {
    if (req.method === "OPTIONS") return preflight();
    return json(200, { status: "ok", timestamp: new Date().toISOString() });
  },
});
