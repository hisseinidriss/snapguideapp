// /api/apps — list, create, get, update, delete
const { app } = require("@azure/functions");
const { query } = require("../shared/db");
const { json, preflight, handleError } = require("../shared/http");
const { deletePrefix } = require("../shared/storage");

const SELECT = `id, name, description, url, icon_url, auto_redact,
                created_at, updated_at`;

app.http("apps-collection", {
  route: "apps",
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    try {
      if (req.method === "GET") {
        const r = await query(
          `SELECT ${SELECT} FROM apps ORDER BY created_at DESC`
        );
        return json(200, r.rows);
      }
      // POST create
      const body = await req.json();
      if (!body?.name) return json(400, { error: "name is required" });
      const r = await query(
        `INSERT INTO apps (name, url, description)
         VALUES ($1, $2, $3)
         RETURNING ${SELECT}`,
        [body.name, body.url || "", body.description || ""]
      );
      return json(201, r.rows[0]);
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});

app.http("apps-item", {
  route: "apps/{id}",
  methods: ["GET", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    const id = req.params.id;
    try {
      if (req.method === "GET") {
        const r = await query(`SELECT ${SELECT} FROM apps WHERE id = $1`, [id]);
        if (!r.rows[0]) return json(404, { error: "Not found" });
        return json(200, r.rows[0]);
      }
      if (req.method === "PATCH") {
        const body = await req.json();
        // Whitelist updatable columns
        const allowed = ["name", "description", "url", "icon_url", "auto_redact"];
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
          `UPDATE apps SET ${sets.join(", ")} WHERE id = $${i} RETURNING ${SELECT}`,
          values
        );
        if (!r.rows[0]) return json(404, { error: "Not found" });
        return json(200, r.rows[0]);
      }
      // DELETE
      // Cascade clean up icon files (best effort)
      await deletePrefix("app-icons", `${id}/`).catch(() => {});
      await query(`DELETE FROM apps WHERE id = $1`, [id]);
      return json(204, null);
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});
