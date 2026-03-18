import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../db";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";

app.http("recordings-list", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "recordings",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const appId = req.query.get("app_id");
      if (!appId) return errorResponse("app_id required", 400);
      const result = await query(
        "SELECT * FROM process_recordings WHERE app_id = $1 ORDER BY created_at DESC",
        [appId]
      );
      return jsonResponse(result.rows);
    } catch (err: any) {
      context.error("Recordings error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("recordings-get-update-delete", {
  methods: ["GET", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "recordings/{id}",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    const id = req.params.id;
    try {
      if (req.method === "GET") {
        const result = await query("SELECT * FROM process_recordings WHERE id = $1", [id]);
        if (result.rows.length === 0) return errorResponse("Not found", 404);
        return jsonResponse(result.rows[0]);
      }

      if (req.method === "PATCH") {
        const body = await req.json() as any;
        const allowedFields = ["title", "description", "status", "tour_id"];
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;
        for (const [key, value] of Object.entries(body)) {
          if (allowedFields.includes(key)) {
            fields.push(`${key} = $${i++}`);
            values.push(value);
          }
        }
        if (fields.length === 0) return errorResponse("No valid fields", 400);
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const result = await query(
          `UPDATE process_recordings SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
          values
        );
        if (result.rows.length === 0) return errorResponse("Not found", 404);
        return jsonResponse(result.rows[0]);
      }

      if (req.method === "DELETE") {
        await query("DELETE FROM process_recordings WHERE id = $1", [id]);
        return { status: 204, headers: corsHeaders() };
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Recording detail error:", err);
      return errorResponse(err.message);
    }
  },
});

// Recording steps
app.http("recording-steps-list", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "recordings/{recordingId}/steps",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const recordingId = req.params.recordingId;
      const result = await query(
        "SELECT * FROM process_recording_steps WHERE recording_id = $1 ORDER BY sort_order ASC",
        [recordingId]
      );
      return jsonResponse(result.rows);
    } catch (err: any) {
      context.error("Recording steps error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("recording-steps-create", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "recording-steps",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const body = await req.json() as any;
      const { recording_id, action_type, instruction, selector, target_url, element_text, element_tag, input_value, sort_order, notes, screenshot_url } = body;
      const result = await query(
        `INSERT INTO process_recording_steps (recording_id, action_type, instruction, selector, target_url, element_text, element_tag, input_value, sort_order, notes, screenshot_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [recording_id, action_type || "click", instruction || "", selector || "",
         target_url || "", element_text || "", element_tag || "", input_value || "",
         sort_order || 0, notes || "", screenshot_url || ""]
      );
      return jsonResponse(result.rows[0], 201);
    } catch (err: any) {
      context.error("Recording step create error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("recording-steps-update-delete", {
  methods: ["PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "recording-steps/{id}",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    const id = req.params.id;
    try {
      if (req.method === "PATCH") {
        const body = await req.json() as any;
        const allowedFields = ["action_type", "instruction", "selector", "target_url", "element_text", "element_tag", "input_value", "sort_order", "notes", "screenshot_url"];
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;
        for (const [key, value] of Object.entries(body)) {
          if (allowedFields.includes(key)) {
            fields.push(`${key} = $${i++}`);
            values.push(value);
          }
        }
        if (fields.length === 0) return errorResponse("No valid fields", 400);
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const result = await query(
          `UPDATE process_recording_steps SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
          values
        );
        if (result.rows.length === 0) return errorResponse("Not found", 404);
        return jsonResponse(result.rows[0]);
      }

      if (req.method === "DELETE") {
        await query("DELETE FROM process_recording_steps WHERE id = $1", [id]);
        return { status: 204, headers: corsHeaders() };
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Recording step detail error:", err);
      return errorResponse(err.message);
    }
  },
});
