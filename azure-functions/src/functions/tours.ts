import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../db";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";

app.http("tours-list-create", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "tours",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      if (req.method === "GET") {
        const appId = req.query.get("app_id");
        if (!appId) return errorResponse("app_id required", 400);
        const result = await query(
          "SELECT * FROM tours WHERE app_id = $1 ORDER BY sort_order ASC, created_at ASC",
          [appId]
        );
        return jsonResponse(result.rows);
      }

      if (req.method === "POST") {
        const body = await req.json() as any;
        const { app_id, name, sort_order } = body;
        const result = await query(
          "INSERT INTO tours (app_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *",
          [app_id, name, sort_order || 0]
        );
        return jsonResponse(result.rows[0], 201);
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Tours error:", err);
      return errorResponse(err.message);
    }
  },
});

app.http("tours-get-update-delete", {
  methods: ["GET", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "tours/{id}",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    const id = req.params.id;
    try {
      if (req.method === "GET") {
        const result = await query("SELECT * FROM tours WHERE id = $1", [id]);
        if (result.rows.length === 0) return errorResponse("Not found", 404);
        return jsonResponse(result.rows[0]);
      }

      if (req.method === "PATCH") {
        const body = await req.json() as any;
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;
        for (const [key, value] of Object.entries(body)) {
          if (["name", "sort_order", "app_id"].includes(key)) {
            fields.push(`${key} = $${i++}`);
            values.push(value);
          }
        }
        if (fields.length === 0) return errorResponse("No valid fields", 400);
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const result = await query(
          `UPDATE tours SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
          values
        );
        if (result.rows.length === 0) return errorResponse("Not found", 404);
        return jsonResponse(result.rows[0]);
      }

      if (req.method === "DELETE") {
        await query("DELETE FROM tours WHERE id = $1", [id]);
        return { status: 204, headers: corsHeaders() };
      }

      return errorResponse("Method not allowed", 405);
    } catch (err: any) {
      context.error("Tour detail error:", err);
      return errorResponse(err.message);
    }
  },
});
