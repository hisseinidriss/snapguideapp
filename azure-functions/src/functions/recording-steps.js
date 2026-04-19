// /api/recording-steps — list (by recording_id), create, update, delete
const { app } = require("@azure/functions");
const { query } = require("../shared/db");
const { json, preflight, handleError } = require("../shared/http");
const { deleteBlob, extractPathFromUrl } = require("../shared/storage");

const SELECT = `id, recording_id, sort_order, action_type, instruction, notes,
                selector, target_url, screenshot_url, element_text, element_tag,
                input_value, created_at, updated_at`;

app.http("recording-steps-collection", {
  route: "recording-steps",
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    try {
      if (req.method === "GET") {
        const recordingId = req.query.get("recording_id");
        if (!recordingId) return json(400, { error: "recording_id is required" });
        const r = await query(
          `SELECT ${SELECT} FROM process_recording_steps
           WHERE recording_id = $1 ORDER BY sort_order ASC`,
          [recordingId]
        );
        return json(200, r.rows);
      }
      const body = await req.json();
      if (!body?.recording_id) return json(400, { error: "recording_id required" });
      const cols = [
        "recording_id", "sort_order", "action_type", "instruction", "notes",
        "selector", "target_url", "screenshot_url", "element_text",
        "element_tag", "input_value",
      ];
      const values = cols.map((c) => body[c] ?? null);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const r = await query(
        `INSERT INTO process_recording_steps (${cols.join(", ")})
         VALUES (${placeholders}) RETURNING ${SELECT}`,
        values
      );
      return json(201, r.rows[0]);
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});

app.http("recording-steps-item", {
  route: "recording-steps/{id}",
  methods: ["PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    if (req.method === "OPTIONS") return preflight();
    const id = req.params.id;
    try {
      if (req.method === "PATCH") {
        const body = await req.json();
        const allowed = [
          "sort_order", "action_type", "instruction", "notes", "selector",
          "target_url", "screenshot_url", "element_text", "element_tag",
          "input_value",
        ];
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
          `UPDATE process_recording_steps SET ${sets.join(", ")}
           WHERE id = $${i} RETURNING ${SELECT}`,
          values
        );
        if (!r.rows[0]) return json(404, { error: "Not found" });
        return json(200, r.rows[0]);
      }
      // DELETE — also remove the screenshot blob if present
      const r = await query(
        `SELECT screenshot_url FROM process_recording_steps WHERE id = $1`,
        [id]
      );
      const url = r.rows[0]?.screenshot_url;
      const path = extractPathFromUrl("recording-screenshots", url);
      if (path) await deleteBlob("recording-screenshots", path).catch(() => {});
      await query(`DELETE FROM process_recording_steps WHERE id = $1`, [id]);
      return json(204, null);
    } catch (e) {
      return handleError(ctx, e);
    }
  },
});
