import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../db";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";

app.http("tour-steps-list-create", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "tour-steps",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      if (req.method === "GET") {
        const tourId = req.query.get("tour_id");
        if (!tourId) return errorResponse("tour_id required", 400);
        const result = await query(
          "SELECT * FROM tour_steps WHERE tour_id = $1 ORDER BY sort_order ASC",
          [tourId]
        );
        return jsonResponse(result.rows);
      }

      if (req.method === "POST") {
        const body = await req.json() as any;
        const { tour_id, title, content, selector, placement, target_url, click_selector, step_type, video_url, sort_order } = body;
        const result = await query(
          `INSERT INTO tour_steps (tour_id, title, content, selector, placement, target_url, click_selector, step_type, video_url, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [tour_id, title || "New Step", content || "Describe what happens here.", selector || "",
           placement || "bottom", target_url || null, click_selector || null,
           step_type || "standard", video_url || null, sort_order || 0]
        );
        return jsonResponse(result.rows[0], 201);
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Tour steps error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("tour-steps-by-tours", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "tour-steps/by-tours",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      const body = await req.json() as any;
      const { tour_ids } = body;
      if (!tour_ids || !Array.isArray(tour_ids) || tour_ids.length === 0) {
        return jsonResponse([]);
      }
      const placeholders = tour_ids.map((_: any, i: number) => `$${i + 1}`).join(", ");
      const result = await query(
        `SELECT * FROM tour_steps WHERE tour_id IN (${placeholders}) ORDER BY sort_order ASC`,
        tour_ids
      );
      return jsonResponse(result.rows);
    } catch (err: any) {
      context.error("Tour steps by tours error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("tour-steps-update-delete", {
  methods: ["PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "tour-steps/{id}",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    const id = req.params.id;
    try {
      if (req.method === "PATCH") {
        const body = await req.json() as any;
        const allowedFields = ["title", "content", "selector", "placement", "target_url", "click_selector", "step_type", "video_url", "sort_order", "tour_id"];
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
          `UPDATE tour_steps SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
          values
        );
        if (result.rows.length === 0) return errorResponse("Not found", 404);
        return jsonResponse(result.rows[0]);
      }

      if (req.method === "DELETE") {
        await query("DELETE FROM tour_steps WHERE id = $1", [id]);
        return { status: 204, headers: corsHeaders() };
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Tour step detail error:", err);
      return errorResponse(err.message);
    }
  },
});
