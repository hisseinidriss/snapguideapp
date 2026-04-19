// /api/recordings — list (by app_id), create, get, update, delete
const { app } = require("@azure/functions");
const { query } = require("../shared/db");
const { json, preflight, handleError } = require("../shared/http");
const { deletePrefix } = require("../shared/storage");

const SELECT = `id, app_id, tour_id, title, description, status,
                created_at, updated_at`;

app.http("recordings-collection", {
  route: "recordings",
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    try {
      if (req.method === "GET") {
        const appId = req.query.get("app_id");
        if (!appId) return json(400, { error: "app_id is required" });
        const r = await query(
          `SELECT ${SELECT} FROM process_recordings
           WHERE app_id = $1 ORDER BY created_at ASC`,
          [appId]
        );
        return json(200, r.rows);
      }
      const body = await req.json();
      if (!body?.app_id || !body?.title) {
        return json(400, { error: "app_id and title required" });
      }
      const r = await query(
        `INSERT INTO process_recordings (app_id, title, status)
         VALUES ($1, $2, $3)
         RETURNING ${SELECT}`,
        [body.app_id, body.title, body.status || "draft"]
      );
      return json(201, r.rows[0]);
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});

app.http("recordings-item", {
  route: "recordings/{id}",
  methods: ["GET", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    const id = req.params.id;
    try {
      if (req.method === "GET") {
        const r = await query(
          `SELECT ${SELECT} FROM process_recordings WHERE id = $1`,
          [id]
        );
        if (!r.rows[0]) return json(404, { error: "Not found" });
        return json(200, r.rows[0]);
      }
      if (req.method === "PATCH") {
        const body = await req.json();
        const allowed = ["title", "description", "status", "tour_id"];
        const sets = [];
        const values = [];
        let i = 1;
        for (const k of allowed) {
          if (k in body) {
            sets.push(`${k} = $${i++}`);
            values.push(body[k]);
          }
        }
        if (!sets.length) return json(400, { error: "No updatable fields" });
        sets.push(`updated_at = now()`);
        values.push(id);
        const r = await query(
          `UPDATE process_recordings SET ${sets.join(", ")}
           WHERE id = $${i} RETURNING ${SELECT}`,
          values
        );
        if (!r.rows[0]) return json(404, { error: "Not found" });
        return json(200, r.rows[0]);
      }
      // DELETE — also wipe screenshots folder
      await deletePrefix("recording-screenshots", `${id}/`).catch(() => {});
      await query(`DELETE FROM process_recordings WHERE id = $1`, [id]);
      return json(204, null);
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});
