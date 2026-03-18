import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../db";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";

app.http("launchers-list-create", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "launchers",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      if (req.method === "GET") {
        const appId = req.query.get("app_id");
        if (!appId) return errorResponse("app_id required", 400);
        const result = await query(
          "SELECT * FROM launchers WHERE app_id = $1 ORDER BY created_at DESC",
          [appId]
        );
        return jsonResponse(result.rows);
      }

      if (req.method === "POST") {
        const body = await req.json() as any;
        const { app_id, name, type, selector, tour_id, color, label, pulse, is_active } = body;
        const result = await query(
          `INSERT INTO launchers (app_id, name, type, selector, tour_id, color, label, pulse, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [app_id, name, type || "beacon", selector || "", tour_id || null,
           color || "#1e6b45", label || "", pulse !== undefined ? pulse : true,
           is_active !== undefined ? is_active : true]
        );
        return jsonResponse(result.rows[0], 201);
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Launchers error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("launchers-update-delete", {
  methods: ["PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "launchers/{id}",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    const id = req.params.id;
    try {
      if (req.method === "PATCH") {
        const body = await req.json() as any;
        const allowedFields = ["name", "type", "selector", "tour_id", "color", "label", "pulse", "is_active"];
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
          `UPDATE launchers SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
          values
        );
        if (result.rows.length === 0) return errorResponse("Not found", 404);
        return jsonResponse(result.rows[0]);
      }

      if (req.method === "DELETE") {
        await query("DELETE FROM launchers WHERE id = $1", [id]);
        return { status: 204, headers: corsHeaders() };
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Launcher detail error:", err);
      return errorResponse(err.message);
    }
  },
});
